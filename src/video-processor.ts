import ffmpeg from 'fluent-ffmpeg';
import * as fs from 'fs';
import * as path from 'path';

function probeFile(filePath: string): Promise<any> {
    return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(filePath, (err, data) => err ? reject(err) : resolve(data));
    });
}

export interface VideoInfo {
    width: number;
    height: number;
    codecName: string;
    hasAudio: boolean;
    duration: number;
}

export async function getVideoInfo(filePath: string): Promise<VideoInfo> {
    const data = await probeFile(filePath);
    const vs = data.streams.find((s: any) => s.codec_type === 'video');
    return {
        width: vs?.width ?? 0,
        height: vs?.height ?? 0,
        codecName: vs?.codec_name ?? '',
        hasAudio: data.streams.some((s: any) => s.codec_type === 'audio'),
        duration: data.format.duration ?? 0,
    };
}

/**
 * Joins video files into a single AVI.
 * When target is omitted all files must share the same codec and resolution — a fast
 * stream-copy is used.  When target is provided every clip is scaled and re-encoded,
 * which handles mixed codecs, resolutions, and audio-less clips (e.g. image-to-video).
 */
export async function joinVideos(
    directoryOrFiles: string | string[],
    output: string,
    target?: { width: number; height: number },
): Promise<void> {
    let files: string[];

    if (Array.isArray(directoryOrFiles)) {
        files = directoryOrFiles;
        if (files.length === 0) throw new Error('No files provided to join');
    } else {
        files = fs.readdirSync(directoryOrFiles)
            .filter(file => file.toLowerCase().endsWith('.avi') || file.toLowerCase().endsWith('.mp4'))
            .sort()
            .map(file => path.join(directoryOrFiles, file));
        if (files.length === 0) throw new Error('No compatible video files found in directory');
    }

    const absoluteFiles = files.map(f => path.resolve(f));

    if (!target) {
        // Fast path: stream copy via concat demuxer (all files must be identical format).
        const listPath = path.join('/tmp', `ffmpeg_concat_${Date.now()}.txt`);
        const listContent = absoluteFiles.map(f => `file '${f.replace(/'/g, "'\\''")}'`).join('\n');
        fs.writeFileSync(listPath, listContent);

        return new Promise((resolve, reject) => {
            ffmpeg()
                .input(listPath)
                .inputOptions(['-f concat', '-safe 0'])
                .outputOptions(['-c copy'])
                .on('error', (err: any) => {
                    if (fs.existsSync(listPath)) fs.unlinkSync(listPath);
                    reject(new Error(err));
                })
                .on('end', () => {
                    if (fs.existsSync(listPath)) fs.unlinkSync(listPath);
                    resolve();
                })
                .save(output);
        });
    }

    // Re-encode path: scale everything to target resolution, synthesise silence where needed.
    const probes = await Promise.all(absoluteFiles.map(probeFile));
    const hasAudio = probes.map(p => p.streams.some((s: any) => s.codec_type === 'audio'));
    const { width: targetW, height: targetH } = target;

    return new Promise((resolve, reject) => {
        const cmd = ffmpeg() as any;
        for (const f of absoluteFiles) cmd.input(f);

        const n = absoluteFiles.length;
        const filterParts: string[] = [];
        let concatInputs = '';

        for (let i = 0; i < n; i++) {
            filterParts.push(
                `[${i}:v]scale=${targetW}:${targetH}:force_original_aspect_ratio=decrease,` +
                `pad=${targetW}:${targetH}:(ow-iw)/2:(oh-ih)/2,setsar=1[v${i}]`
            );
            if (hasAudio[i]) {
                filterParts.push(`[${i}:a]aformat=sample_rates=44100:channel_layouts=stereo[a${i}]`);
            } else {
                const duration = probes[i].format.duration as number;
                filterParts.push(`aevalsrc=0:c=stereo:s=44100:d=${duration}[a${i}]`);
            }
            concatInputs += `[v${i}][a${i}]`;
        }

        filterParts.push(`${concatInputs}concat=n=${n}:v=1:a=1[outv][outa]`);

        cmd
            .complexFilter(filterParts.join(';'))
            .outputOptions(['-map [outv]', '-map [outa]', '-c:v mjpeg', '-c:a pcm_s16le'])
            .on('error', (err: any) => reject(new Error(err)))
            .on('end', () => resolve())
            .save(output);
    });
}

/**
 * Converts a video to a YouTube-optimized format.
 */
export async function convertToYouTube(input: string, output: string): Promise<void> {
    return new Promise((resolve, reject) => {
        (ffmpeg(input) as any)
            .outputOptions([
                '-c:v libx264',
                '-crf 23',
                '-preset medium',
                '-c:a aac',
                '-b:a 128k',
                '-vf format=yuv420p'
            ])
            .on('error', (err: any) => reject(new Error(err)))
            .on('end', () => resolve())
            .save(output);
    });
}

/**
 * Strips audio from a file and optionally adds new audio files.
 */
export async function processAudio(input: string, output: string, audioFiles?: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
        const command = ffmpeg(input) as any;

        if (!audioFiles || audioFiles.length === 0) {
            command.noAudio();
        } else {
            // Add new audio files
            audioFiles.forEach(audio => {
                command.input(audio).inputOptions(['-stream_loop', '-1']);
            });

            // For simplicity, we'll just use the first audio file and loop it or truncate it
            command.outputOptions([
                '-map 0:v:0',
                '-map 1:a:0',
                '-shortest'
            ]);
        }

        command
            // Use MJPEG and PCM for consistency and speed (AVI format)
            .videoCodec('mjpeg')
            .on('error', (err: any) => reject(new Error(err)))
            .on('end', () => resolve());

        if (audioFiles && audioFiles.length > 0) {
            command.audioCodec('pcm_s16le');
        }

        command.save(output);
    });
}

/**
 * Extracts a sub-clip from a video between startTime and endTime.
 * Uses stream-copy (-c copy) for a fast, lossless extraction.
 *
 * Times can be in seconds or any format ffmpeg accepts (e.g. "HH:MM:SS").
 */
export async function extractClip(
    input: string,
    startTime: string,
    endTime: string,
    output: string
): Promise<void> {
    // Convert times to seconds for duration calculation
    const parseTime = (time: string): number => {
        const parts = time.split(':').map(Number);
        if (parts.length === 1) return parts[0];
        if (parts.length === 2) return parts[0] * 60 + parts[1];
        if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
        return 0;
    };

    const startSec = parseTime(startTime);
    const endSec = parseTime(endTime);
    const duration = endSec - startSec;

    return new Promise((resolve, reject) => {
        (ffmpeg(input) as any)
            .inputOptions([`-ss ${startTime}`])
            .outputOptions([`-t ${duration}`, '-c copy'])
            .on('error', (err: any) => reject(new Error(err)))
            .on('end', () => resolve())
            .save(output);
    });
}

/**
 * Changes the playback speed of a video.
 * speed > 1.0 is faster, speed < 1.0 is slower (slow motion).
 */
export async function changeSpeed(
    input: string,
    output: string,
    speed: number
): Promise<void> {
    if (speed <= 0) throw new Error('Speed must be greater than 0');

    return new Promise((resolve, reject) => {
        // Video filter: setpts = (1/speed)*(PTS-STARTPTS)
        // Normalizing PTS ensures the output starts at time 0.
        const videoFilter = `setpts=${(1 / speed).toFixed(4)}*(PTS-STARTPTS)`;

        // Audio filter: atempo (must be between 0.5 and 2.0)
        // If outside this range, we need to chain atempo filters.
        const audioFilters: string[] = [];
        let tempSpeed = speed;
        while (tempSpeed > 2.0) {
            audioFilters.push('atempo=2.0');
            tempSpeed /= 2.0;
        }
        while (tempSpeed < 0.5) {
            audioFilters.push('atempo=0.5');
            tempSpeed /= 0.5;
        }
        audioFilters.push(`atempo=${tempSpeed.toFixed(4)}`);
        const audioFilter = audioFilters.join(',');

        (ffmpeg(input) as any)
            .videoFilters(videoFilter)
            .audioFilters(audioFilter)
            // Use MJPEG and PCM for compatibility with the original FPV AVI files
            // This allows the 'join' command (which uses stream copy) to work correctly.
            .videoCodec('mjpeg')
            .audioCodec('pcm_s16le')
            .on('error', (err: any) => reject(new Error(err)))
            .on('end', () => resolve())
            .save(output);
    });
}

/**
 * Creates a video from a static image looped for a specified duration.
 * Supports PNG and JPEG images.
 */
export async function imageToVideo(
    imagePath: string,
    duration: number,
    output: string
): Promise<void> {
    if (duration <= 0) throw new Error('Duration must be greater than 0');

    return new Promise((resolve, reject) => {
        (ffmpeg(imagePath) as any)
            .inputOptions(['-loop 1'])
            .outputOptions([
                '-c:v libx264',
                '-crf 23',
                '-preset medium',
                '-pix_fmt yuv420p',
                `-t ${duration}`
            ])
            .on('error', (err: any) => reject(new Error(err)))
            .on('end', () => resolve())
            .save(output);
    });
}
