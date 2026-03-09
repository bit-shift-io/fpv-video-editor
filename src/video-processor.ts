import ffmpeg from 'fluent-ffmpeg';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Joins video files into a single MP4.
 * Uses the FFmpeg 'concat' demuxer for a near-instant, lossless join (stream copy).
 */
export async function joinVideos(directoryOrFiles: string | string[], output: string): Promise<void> {
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

    // FFmpeg concat demuxer requires a text file listing input paths
    const listPath = path.join('/tmp', `ffmpeg_concat_${Date.now()}.txt`);
    const listContent = files.map(f => `file '${f.replace(/'/g, "'\\''")}'`).join('\n');
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
            .on('error', (err: any) => reject(new Error(err)))
            .on('end', () => resolve())
            .save(output);
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
    return new Promise((resolve, reject) => {
        (ffmpeg(input) as any)
            .inputOptions([`-ss ${startTime}`, `-to ${endTime}`])
            .outputOptions(['-c copy'])
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
        // Video filter: setpts = (1/speed)*PTS
        const videoFilter = `setpts=${(1 / speed).toFixed(4)}*PTS`;

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
            .videoCodec('mpeg4')
            .audioCodec('libmp3lame')
            .on('error', (err: any) => reject(new Error(err)))
            .on('end', () => resolve())
            .save(output);
    });
}
