import ffmpeg from 'fluent-ffmpeg';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Joins video files into a single MP4.
 * Pass an explicit `files` array (from the working collection), or a `directory`
 * path to auto-discover AVI files inside it.
 */
export async function joinVideos(directoryOrFiles: string | string[], output: string): Promise<void> {
    let files: string[];

    if (Array.isArray(directoryOrFiles)) {
        files = directoryOrFiles;
        if (files.length === 0) throw new Error('No files provided to join');
    } else {
        files = fs.readdirSync(directoryOrFiles)
            .filter(file => file.toLowerCase().endsWith('.avi'))
            .sort()
            .map(file => path.join(directoryOrFiles, file));
        if (files.length === 0) throw new Error('No AVI files found in directory');
    }

    return new Promise((resolve, reject) => {
        const command = ffmpeg();
        files.forEach(file => command.input(file));

        (command as any)
            .on('error', (err: any) => reject(new Error(err)))
            .on('end', () => resolve())
            .mergeToFile(output, '/tmp/');
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
