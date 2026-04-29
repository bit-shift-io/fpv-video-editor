#!/usr/bin/env ts-node
import { Command } from 'commander';
import { select, input, Separator } from '@inquirer/prompts';
import chalk from 'chalk';
import ora from 'ora';
import * as path from 'path';
import { joinVideos, convertToYouTube, processAudio, extractClip, changeSpeed, imageToVideo } from './video-processor';
import { listVideoFiles, listImageFiles, listSubdirectories } from './collection';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function printBanner() {
    console.log(chalk.cyan.bold('\n  🎬  FPV Video Editor'));
    console.log(chalk.dim('  ─────────────────────────────\n'));
}

// ─── Actions (shared between interactive & CLI modes) ────────────────────────

async function runJoin(directoryOrFiles: string | string[], output: string) {
    const spinner = ora(chalk.blue('Joining videos...')).start();
    try {
        const outputPath = path.resolve(output);
        if (typeof directoryOrFiles === 'string') {
            await joinVideos(path.resolve(directoryOrFiles), outputPath);
        } else {
            await joinVideos(directoryOrFiles, outputPath);
        }
        spinner.succeed(chalk.green(`Successfully joined videos into ${outputPath}`));
    } catch (error: any) {
        spinner.fail(chalk.red(`Failed to join videos: ${error.message}`));
    }
}

async function runConvert(file: string, output?: string) {
    const inputPath = path.resolve(file);
    const outputPath = path.resolve(output || file.replace(/\.[^/.]+$/, '') + '_yt.mp4');
    const spinner = ora(chalk.blue(`Converting ${path.basename(file)} to YouTube format...`)).start();
    try {
        await convertToYouTube(inputPath, outputPath);
        spinner.succeed(chalk.green(`Successfully converted to ${outputPath}`));
    } catch (error: any) {
        spinner.fail(chalk.red(`Conversion failed: ${error.message}`));
    }
}

function timeToFilePart(t: string): string {
    // Replace colons with hyphens so the time is safe in filenames (e.g. 00:01:30 -> 00-01-30)
    return t.replace(/:/g, '-');
}

async function runExtract(file: string, startTime: string, endTime: string, output?: string) {
    const inputPath = path.resolve(file);
    const ext = path.extname(file) || '.mp4';
    const base = path.basename(file, ext);
    const dir = path.dirname(inputPath);
    const autoName = `${base}_${timeToFilePart(startTime)}_${timeToFilePart(endTime)}${ext}`;
    const outputPath = path.resolve(output || path.join(dir, autoName));
    const spinner = ora(chalk.blue(`Extracting ${startTime} → ${endTime} from ${path.basename(file)}...`)).start();
    try {
        await extractClip(inputPath, startTime, endTime, outputPath);
        spinner.succeed(chalk.green(`Clip saved to ${outputPath}`));
    } catch (error: any) {
        spinner.fail(chalk.red(`Extraction failed: ${error.message}`));
    }
}

async function runAudio(file: string, output?: string, replace?: string[]) {
    const inputPath = path.resolve(file);
    const outputPath = path.resolve(output || file.replace(/\.[^/.]+$/, '') + '_processed.avi');
    const action = replace && replace.length > 0 ? 'Replacing audio' : 'Stripping audio';
    const spinner = ora(chalk.blue(`${action} in ${path.basename(file)}...`)).start();
    try {
        await processAudio(inputPath, outputPath, replace);
        spinner.succeed(chalk.green(`Successfully processed audio into ${outputPath}`));
    } catch (error: any) {
        spinner.fail(chalk.red(`Audio processing failed: ${error.message}`));
    }
}

async function runSpeed(file: string, speed: number, output?: string) {
    const inputPath = path.resolve(file);
    const suffix = speed < 1.0 ? '_slow' : '_fast';
    const outputPath = path.resolve(output || file.replace(/\.[^/.]+$/, '') + suffix + '.avi');
    const spinner = ora(chalk.blue(`Changing playback speed of ${path.basename(file)} to ${speed}x...`)).start();
    try {
        await changeSpeed(inputPath, outputPath, speed);
        spinner.succeed(chalk.green(`Successfully changed speed into ${outputPath}`));
    } catch (error: any) {
        spinner.fail(chalk.red(`Speed modification failed: ${error.message}`));
    }
}

async function runImageToVideo(file: string, duration: number, output?: string) {
    const inputPath = path.resolve(file);
    const ext = path.extname(file) || '.mp4';
    const base = path.basename(file, ext);
    const dir = path.dirname(inputPath);
    const autoName = `${base}_${duration}s${ext.replace(/\.[^/.]+$/, '')}.mp4`;
    const outputPath = path.resolve(output || path.join(dir, autoName));
    const spinner = ora(chalk.blue(`Creating ${duration}s video from ${path.basename(file)}...`)).start();
    try {
        await imageToVideo(inputPath, duration, outputPath);
        spinner.succeed(chalk.green(`Video created at ${outputPath}`));
    } catch (error: any) {
        spinner.fail(chalk.red(`Video creation failed: ${error.message}`));
    }
}

// ─── File browser helpers ─────────────────────────────────────────────────────

async function browseAndPickFile(
    message: string,
    listFiles: (dir: string) => string[],
    fileIcon = '🎞',
): Promise<string> {
    let currentDir = process.cwd();

    while (true) {
        const subdirs = listSubdirectories(currentDir);
        const files = listFiles(currentDir);
        const parentDir = path.dirname(currentDir);
        const choices: any[] = [];

        if (parentDir !== currentDir) {
            choices.push({ name: chalk.dim('⬆   .. (go up)'), value: '__UP__' });
        }
        if (subdirs.length > 0) {
            choices.push(new Separator(chalk.dim('── Directories ──')));
            for (const d of subdirs) {
                choices.push({ name: `📁  ${path.basename(d)}`, value: `__DIR__:${d}` });
            }
        }
        if (files.length > 0) {
            choices.push(new Separator(chalk.dim('── Files ──')));
            for (const f of files) {
                choices.push({ name: `${fileIcon}   ${path.basename(f)}`, value: f });
            }
        }
        choices.push(new Separator());
        choices.push({ name: chalk.dim('✏️   Enter path manually'), value: '__MANUAL__' });

        console.log(chalk.dim(`\n  📂  ${currentDir}`));
        const picked = await select({ message, choices, pageSize: 20 });

        if (picked === '__MANUAL__') {
            return await input({
                message: 'File path:',
                validate: (v) => v.trim() !== '' || 'File is required',
            });
        } else if (picked === '__UP__') {
            currentDir = parentDir;
        } else if (typeof picked === 'string' && picked.startsWith('__DIR__:')) {
            currentDir = picked.slice('__DIR__:'.length);
        } else {
            return picked as string;
        }
    }
}

async function browseAndPickFiles(
    message: string,
    listFiles: (dir: string) => string[],
): Promise<string[]> {
    let currentDir = process.cwd();
    const selected: string[] = [];

    while (true) {
        const subdirs = listSubdirectories(currentDir);
        const files = listFiles(currentDir);
        const parentDir = path.dirname(currentDir);
        const choices: any[] = [];

        if (parentDir !== currentDir) {
            choices.push({ name: chalk.dim('⬆   .. (go up)'), value: '__UP__' });
        }
        if (subdirs.length > 0) {
            choices.push(new Separator(chalk.dim('── Directories ──')));
            for (const d of subdirs) {
                choices.push({ name: `📁  ${path.basename(d)}`, value: `__DIR__:${d}` });
            }
        }
        if (files.length > 0) {
            choices.push(new Separator(chalk.dim('── Files ──')));
            choices.push({ name: chalk.green('✅  Add all files here'), value: '__ALL__' });
            for (const f of files) {
                const tick = selected.includes(f) ? chalk.yellow(' ★') : '';
                choices.push({ name: `🎞   ${path.basename(f)}${tick}`, value: f });
            }
        }
        choices.push(new Separator());
        if (selected.length > 0) {
            choices.push({
                name: chalk.green(`🔙  Done (${selected.length} file${selected.length === 1 ? '' : 's'} selected)`),
                value: '__DONE__',
            });
        }
        choices.push({ name: chalk.dim('✏️   Enter path manually'), value: '__MANUAL__' });

        console.log(chalk.dim(`\n  📂  ${currentDir}`));
        const label = selected.length > 0 ? `${message} (${selected.length} selected)` : message;
        const picked = await select({ message: label, choices, pageSize: 20 });

        if (picked === '__DONE__') {
            return selected;
        } else if (picked === '__MANUAL__') {
            const manualPath = await input({
                message: 'File path:',
                validate: (v) => v.trim() !== '' || 'File is required',
            });
            if (!selected.includes(manualPath)) {
                selected.push(manualPath);
                console.log(chalk.green(`  ✔  Added ${path.basename(manualPath)}`));
            }
        } else if (picked === '__UP__') {
            currentDir = parentDir;
        } else if (typeof picked === 'string' && picked.startsWith('__DIR__:')) {
            currentDir = picked.slice('__DIR__:'.length);
        } else if (picked === '__ALL__') {
            for (const f of files) {
                if (!selected.includes(f)) selected.push(f);
            }
            console.log(chalk.green(`  ✔  Added ${files.length} file(s) from this directory.`));
        } else {
            const f = picked as string;
            const idx = selected.indexOf(f);
            if (idx === -1) {
                selected.push(f);
                console.log(chalk.green(`  ✔  Added ${path.basename(f)}`));
            } else {
                selected.splice(idx, 1);
                console.log(chalk.yellow(`  ✖  Removed ${path.basename(f)}`));
            }
        }
    }
}

// ─── Interactive prompts ──────────────────────────────────────────────────────

async function promptJoin() {
    const files = await browseAndPickFiles('Pick videos to join:', listVideoFiles);
    if (files.length === 0) {
        console.log(chalk.yellow('  No files selected.'));
        return;
    }
    const output = await input({ message: 'Output filename:', default: 'joined_video.avi' });
    await runJoin(files, output);
}

async function promptConvert() {
    const file = await browseAndPickFile('Pick a video to convert:', listVideoFiles);
    const output = await input({ message: 'Output filename (leave blank for auto):' });
    await runConvert(file, output || undefined);
}

async function promptAudio() {
    const file = await browseAndPickFile('Pick a video to process:', listVideoFiles);

    const mode = await select({
        message: 'What would you like to do?',
        choices: [
            { name: 'Strip audio', value: 'strip' },
            { name: 'Replace audio', value: 'replace' },
        ],
    });

    let replace: string[] | undefined;
    if (mode === 'replace') {
        const audioFiles = await input({
            message: 'Audio file(s) to use (comma-separated):',
            validate: (v) => v.trim() !== '' || 'At least one audio file is required',
        });
        replace = audioFiles.split(',').map((s: string) => s.trim()).filter(Boolean);
    }

    const output = await input({ message: 'Output filename (leave blank for auto):' });
    await runAudio(file, output || undefined, replace);
}

function validateTime(v: string): true | string {
    if (/^\d+(\.\d+)?$/.test(v.trim())) return true;
    if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(v.trim())) return true;
    return 'Enter a valid time: HH:MM:SS, MM:SS, or seconds (e.g. 90)';
}

async function promptExtract() {
    const file = await browseAndPickFile('Pick a video to extract from:', listVideoFiles);

    const startTime = await input({
        message: 'Start time (HH:MM:SS, MM:SS, or seconds):',
        validate: validateTime,
    });
    const endTime = await input({
        message: 'End time   (HH:MM:SS, MM:SS, or seconds):',
        validate: validateTime,
    });

    const output = await input({ message: 'Output filename (leave blank for auto):' });
    await runExtract(file, startTime, endTime, output || undefined);
}

async function promptSpeed() {
    const file = await browseAndPickFile('Pick a video to modify:', listVideoFiles);

    const speedStr = await input({
        message: 'Playback speed (e.g. 0.5 for half speed, 2.0 for double speed):',
        validate: (v) => {
            const n = parseFloat(v);
            if (isNaN(n) || n <= 0) return 'Please enter a speed greater than 0';
            return true;
        },
    });

    const output = await input({ message: 'Output filename (leave blank for auto):' });
    await runSpeed(file, parseFloat(speedStr), output || undefined);
}

async function promptImageToVideo() {
    const file = await browseAndPickFile('Pick an image:', listImageFiles, '🖼️');

    const durationStr = await input({
        message: 'Video duration in seconds (e.g. 5, 10.5):',
        validate: (v) => {
            const n = parseFloat(v);
            if (isNaN(n) || n <= 0) return 'Please enter a duration greater than 0';
            return true;
        },
    });

    const output = await input({ message: 'Output filename (leave blank for auto):' });
    await runImageToVideo(file, parseFloat(durationStr), output || undefined);
}

// ─── Main interactive loop ────────────────────────────────────────────────────

async function interactiveMode() {
    printBanner();

    while (true) {
        const choices: any[] = [
            { name: '📂  Join videos', value: 'join' },
            { name: '✂️   Extract clip', value: 'extract' },
            { name: '⏩  Modify playback speed', value: 'speed' },
            { name: '🖼️   Create video from image', value: 'image' },
            { name: '🔇  Strip / replace audio', value: 'audio' },
            { name: '▶️   Convert to YouTube format', value: 'convert' },
            new Separator(),
            { name: '🚪  Exit', value: 'exit' },
        ];

        const action = await select({ message: 'What would you like to do?', choices });

        if (action === 'exit') {
            console.log(chalk.dim('\n  Goodbye!\n'));
            break;
        }

        console.log();

        if (action === 'join') await promptJoin();
        else if (action === 'extract') await promptExtract();
        else if (action === 'speed') await promptSpeed();
        else if (action === 'image') await promptImageToVideo();
        else if (action === 'convert') await promptConvert();
        else if (action === 'audio') await promptAudio();

        console.log();
    }
}

// ─── CLI mode (unchanged behaviour when args are supplied) ───────────────────

const program = new Command();

program
    .name('fpv-editor')
    .description('A CLI tool for processing FPV videos for YouTube')
    .version('1.0.0');

program
    .command('join')
    .description('Join all AVI files in a directory into a single file')
    .argument('<directory>', 'Directory containing AVI files')
    .option('-o, --output <filename>', 'Output filename', 'joined_video.avi')
    .action(async (directory, options) => {
        await runJoin(directory, options.output);
    });

program
    .command('convert')
    .description('Convert AVI to YouTube-ready MP4 format')
    .argument('<file>', 'Input AVI file')
    .option('-o, --output <filename>', 'Output filename')
    .action(async (file, options) => {
        await runConvert(file, options.output);
    });

program
    .command('extract')
    .description('Extract a sub-clip between a start and end time')
    .argument('<file>', 'Input video file')
    .argument('<start>', 'Start time (HH:MM:SS, MM:SS, or seconds)')
    .argument('<end>', 'End time   (HH:MM:SS, MM:SS, or seconds)')
    .option('-o, --output <filename>', 'Output filename (default: auto-named)')
    .action(async (file, start, end, options) => {
        await runExtract(file, start, end, options.output);
    });

program
    .command('audio')
    .description('Strip or replace audio in a video file')
    .argument('<file>', 'Input video file')
    .option('-o, --output <filename>', 'Output filename')
    .option('-r, --replace <music...>', 'Replace with these audio file(s)')
    .action(async (file, options) => {
        await runAudio(file, options.output, options.replace);
    });

program
    .command('speed')
    .description('Change playback speed of a video')
    .argument('<file>', 'Input video file')
    .argument('<factor>', 'Speed factor (e.g. 0.5, 2.0)')
    .option('-o, --output <filename>', 'Output filename')
    .action(async (file, factor, options) => {
        await runSpeed(file, parseFloat(factor), options.output);
    });

program
    .command('image')
    .description('Create a video from a static image (PNG or JPEG)')
    .argument('<file>', 'Input image file (PNG or JPEG)')
    .argument('<duration>', 'Duration in seconds (e.g. 5, 10.5)')
    .option('-o, --output <filename>', 'Output filename')
    .action(async (file, duration, options) => {
        await runImageToVideo(file, parseFloat(duration), options.output);
    });

// ─── Entry point ─────────────────────────────────────────────────────────────

// If no sub-command arguments were given, enter interactive mode.
// `process.argv` looks like: ['node', 'index.ts', ...rest]
const hasSubCommand = process.argv.slice(2).length > 0;

if (hasSubCommand) {
    program.parse(process.argv);
} else {
    interactiveMode();
}
