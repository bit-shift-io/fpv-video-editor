#!/usr/bin/env ts-node
import { Command } from 'commander';
import { select, input, checkbox, Separator } from '@inquirer/prompts';
import chalk from 'chalk';
import ora from 'ora';
import * as path from 'path';
import { joinVideos, convertToYouTube, processAudio, extractClip } from './video-processor';
import {
    getCollection,
    setCollection,
    addToCollection,
    clearCollection,
    listVideoFiles,
    listSubdirectories,
} from './collection';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function printBanner() {
    console.log(chalk.cyan.bold('\n  🎬  FPV Video Editor'));
    console.log(chalk.dim('  ─────────────────────────────\n'));
}

function printCollectionStatus() {
    const count = getCollection().length;
    if (count === 0) {
        console.log(chalk.dim('  📋  No videos in working collection\n'));
    } else {
        console.log(chalk.yellow(`  📋  ${count} video${count === 1 ? '' : 's'} in working collection\n`));
    }
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
    const outputPath = path.resolve(output || file.replace(/\.[^/.]+$/, '') + '_processed.mp4');
    const action = replace && replace.length > 0 ? 'Replacing audio' : 'Stripping audio';
    const spinner = ora(chalk.blue(`${action} in ${path.basename(file)}...`)).start();
    try {
        await processAudio(inputPath, outputPath, replace);
        spinner.succeed(chalk.green(`Successfully processed audio into ${outputPath}`));
    } catch (error: any) {
        spinner.fail(chalk.red(`Audio processing failed: ${error.message}`));
    }
}

// ─── Browse & pick videos ─────────────────────────────────────────────────────

async function browseAndPickVideos() {
    let currentDir = process.cwd();

    while (true) {
        const subdirs = listSubdirectories(currentDir);
        const videoFiles = listVideoFiles(currentDir);

        type Choice = { name: string; value: string };
        const choices: (Choice | typeof Separator.prototype)[] = [];

        // Navigation: go up
        const parentDir = path.dirname(currentDir);
        if (parentDir !== currentDir) {
            choices.push({ name: chalk.dim('⬆   .. (go up)'), value: '__UP__' });
        }

        if (subdirs.length > 0) {
            choices.push(new Separator(chalk.dim('── Directories ──')));
            for (const d of subdirs) {
                choices.push({ name: `📁  ${path.basename(d)}`, value: `__DIR__:${d}` });
            }
        }

        if (videoFiles.length > 0) {
            choices.push(new Separator(chalk.dim('── Video Files ──')));
            choices.push({ name: chalk.green('✅  Select all files here'), value: '__ALL__' });
            for (const f of videoFiles) {
                const isSelected = getCollection().includes(f);
                const indicator = isSelected ? chalk.yellow(' ★') : '';
                choices.push({ name: `🎞   ${path.basename(f)}${indicator}`, value: f });
            }
        }

        if (choices.length === 0) {
            console.log(chalk.dim('  (empty directory)'));
            return;
        }

        choices.push(new Separator());
        choices.push({ name: chalk.dim('🔙  Done picking'), value: '__DONE__' });

        console.log(chalk.dim(`\n  📂  ${currentDir}`));
        const picked = await select({
            message: 'Navigate or pick files:',
            choices: choices as any,
            pageSize: 20,
        });

        if (picked === '__DONE__') {
            break;
        } else if (picked === '__UP__') {
            currentDir = parentDir;
        } else if (typeof picked === 'string' && picked.startsWith('__DIR__:')) {
            currentDir = picked.slice('__DIR__:'.length);
        } else if (picked === '__ALL__') {
            addToCollection(videoFiles);
            console.log(chalk.green(`  ✔  Added ${videoFiles.length} file(s) from this directory.`));
        } else {
            // Single file
            addToCollection([picked as string]);
            console.log(chalk.green(`  ✔  Added ${path.basename(picked as string)} to collection.`));
        }
    }
}

// ─── Interactive prompts ──────────────────────────────────────────────────────

async function promptJoin() {
    const collection = getCollection();

    let filesToJoin: string[];
    if (collection.length > 0) {
        const useCollection = await select({
            message: `Use working collection (${collection.length} file${collection.length === 1 ? '' : 's'})?`,
            choices: [
                { name: '✅  Yes – use collection', value: 'collection' },
                { name: '📂  No – pick a directory instead', value: 'directory' },
            ],
        });

        if (useCollection === 'collection') {
            filesToJoin = collection;
        } else {
            const directory = await input({
                message: 'Directory containing video files:',
                validate: (v) => v.trim() !== '' || 'Directory is required',
            });
            const output = await input({
                message: 'Output filename:',
                default: 'joined_video.mp4',
            });
            await runJoin(directory, output);
            return;
        }
    } else {
        const directory = await input({
            message: 'Directory containing AVI files:',
            validate: (v) => v.trim() !== '' || 'Directory is required',
        });
        const output = await input({
            message: 'Output filename:',
            default: 'joined_video.mp4',
        });
        await runJoin(directory, output);
        return;
    }

    const output = await input({
        message: 'Output filename:',
        default: 'joined_video.mp4',
    });
    await runJoin(filesToJoin, output);
}

async function promptConvert() {
    const collection = getCollection();
    let file: string;

    if (collection.length > 0) {
        const choice = await select({
            message: 'Which file would you like to convert?',
            choices: [
                ...collection.map(f => ({ name: path.basename(f), value: f })),
                new Separator(),
                { name: chalk.dim('✏️   Enter path manually'), value: '__MANUAL__' },
            ] as any,
        });

        if (choice === '__MANUAL__') {
            file = await input({
                message: 'Input video file:',
                validate: (v) => v.trim() !== '' || 'File is required',
            });
        } else {
            file = choice as string;
        }
    } else {
        file = await input({
            message: 'Input video file:',
            validate: (v) => v.trim() !== '' || 'File is required',
        });
    }

    const output = await input({ message: 'Output filename (leave blank for auto):' });
    await runConvert(file, output || undefined);
}

async function promptAudio() {
    const collection = getCollection();
    let file: string;

    if (collection.length > 0) {
        const choice = await select({
            message: 'Which file would you like to process?',
            choices: [
                ...collection.map(f => ({ name: path.basename(f), value: f })),
                new Separator(),
                { name: chalk.dim('✏️   Enter path manually'), value: '__MANUAL__' },
            ] as any,
        });

        if (choice === '__MANUAL__') {
            file = await input({
                message: 'Input video file:',
                validate: (v) => v.trim() !== '' || 'File is required',
            });
        } else {
            file = choice as string;
        }
    } else {
        file = await input({
            message: 'Input video file:',
            validate: (v) => v.trim() !== '' || 'File is required',
        });
    }

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
    // Accept HH:MM:SS, MM:SS, or plain seconds (integers / decimals)
    if (/^\d+(\.\d+)?$/.test(v.trim())) return true;
    if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(v.trim())) return true;
    return 'Enter a valid time: HH:MM:SS, MM:SS, or seconds (e.g. 90)';
}

async function promptExtract() {
    const collection = getCollection();
    let file: string;

    if (collection.length > 0) {
        const choice = await select({
            message: 'Which file would you like to extract from?',
            choices: [
                ...collection.map(f => ({ name: path.basename(f), value: f })),
                new Separator(),
                { name: chalk.dim('✏️   Enter path manually'), value: '__MANUAL__' },
            ] as any,
        });

        if (choice === '__MANUAL__') {
            file = await input({
                message: 'Input video file:',
                validate: (v) => v.trim() !== '' || 'File is required',
            });
        } else {
            file = choice as string;
        }
    } else {
        file = await input({
            message: 'Input video file:',
            validate: (v) => v.trim() !== '' || 'File is required',
        });
    }

    const startTime = await input({
        message: 'Start time (HH:MM:SS, MM:SS, or seconds):',
        validate: validateTime,
    });

    const endTime = await input({
        message: 'End time   (HH:MM:SS, MM:SS, or seconds):',
        validate: (v) => {
            const basic = validateTime(v);
            if (basic !== true) return basic;
            return true; // further range check is left to ffmpeg
        },
    });

    const output = await input({ message: 'Output filename (leave blank for auto):' });
    await runExtract(file, startTime, endTime, output || undefined);
}

// ─── Main interactive loop ────────────────────────────────────────────────────

async function interactiveMode() {
    printBanner();

    while (true) {
        printCollectionStatus();

        const collection = getCollection();
        const choices: any[] = [
            { name: '📁  Browse & pick videos', value: 'browse' },
            new Separator(),
            { name: '📂  Join videos', value: 'join' },
            { name: '✂️   Extract clip', value: 'extract' },
            { name: '▶️   Convert to YouTube format', value: 'convert' },
            { name: '🔇  Strip / replace audio', value: 'audio' },
        ];

        if (collection.length > 0) {
            choices.push(new Separator());
            choices.push({ name: chalk.red('🗑️   Clear working collection'), value: 'clear' });
        }

        choices.push(new Separator());
        choices.push({ name: '🚪  Exit', value: 'exit' });

        const action = await select({
            message: 'What would you like to do?',
            choices,
        });

        if (action === 'exit') {
            console.log(chalk.dim('\n  Goodbye!\n'));
            break;
        }

        console.log();

        if (action === 'browse') await browseAndPickVideos();
        else if (action === 'join') await promptJoin();
        else if (action === 'extract') await promptExtract();
        else if (action === 'convert') await promptConvert();
        else if (action === 'audio') await promptAudio();
        else if (action === 'clear') {
            clearCollection();
            console.log(chalk.yellow('  🗑️  Working collection cleared.'));
        }

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
    .option('-o, --output <filename>', 'Output filename', 'joined_video.mp4')
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

// ─── Entry point ─────────────────────────────────────────────────────────────

// If no sub-command arguments were given, enter interactive mode.
// `process.argv` looks like: ['node', 'index.ts', ...rest]
const hasSubCommand = process.argv.slice(2).length > 0;

if (hasSubCommand) {
    program.parse(process.argv);
} else {
    interactiveMode();
}
