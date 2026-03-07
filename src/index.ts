#!/usr/bin/env ts-node
import { Command } from 'commander';
import { select, input, Separator } from '@inquirer/prompts';
import chalk from 'chalk';
import ora from 'ora';
import * as path from 'path';
import { joinVideos, convertToYouTube, processAudio } from './video-processor';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function printBanner() {
    console.log(chalk.cyan.bold('\n  🎬  FPV Video Editor'));
    console.log(chalk.dim('  ─────────────────────────────\n'));
}

// ─── Actions (shared between interactive & CLI modes) ────────────────────────

async function runJoin(directory: string, output: string) {
    const spinner = ora(chalk.blue('Joining videos...')).start();
    try {
        const outputPath = path.resolve(output);
        await joinVideos(path.resolve(directory), outputPath);
        spinner.succeed(chalk.green(`Successfully joined videos into ${outputPath}`));
    } catch (error: any) {
        spinner.fail(chalk.red(`Failed to join videos: ${error.message}`));
    }
}

async function runConvert(file: string, output?: string) {
    const inputPath = path.resolve(file);
    const outputPath = path.resolve(output || file.replace(/\.[^/.]+$/, '') + '_yt.mp4');
    const spinner = ora(chalk.blue(`Converting ${file} to YouTube format...`)).start();
    try {
        await convertToYouTube(inputPath, outputPath);
        spinner.succeed(chalk.green(`Successfully converted to ${outputPath}`));
    } catch (error: any) {
        spinner.fail(chalk.red(`Conversion failed: ${error.message}`));
    }
}

async function runAudio(file: string, output?: string, replace?: string[]) {
    const inputPath = path.resolve(file);
    const outputPath = path.resolve(output || file.replace(/\.[^/.]+$/, '') + '_processed.mp4');
    const action = replace && replace.length > 0 ? 'Replacing audio' : 'Stripping audio';
    const spinner = ora(chalk.blue(`${action} in ${file}...`)).start();
    try {
        await processAudio(inputPath, outputPath, replace);
        spinner.succeed(chalk.green(`Successfully processed audio into ${outputPath}`));
    } catch (error: any) {
        spinner.fail(chalk.red(`Audio processing failed: ${error.message}`));
    }
}

// ─── Interactive prompts ──────────────────────────────────────────────────────

async function promptJoin() {
    const directory = await input({
        message: 'Directory containing AVI files:',
        validate: (v) => v.trim() !== '' || 'Directory is required',
    });
    const output = await input({
        message: 'Output filename:',
        default: 'joined_video.mp4',
    });
    await runJoin(directory, output);
}

async function promptConvert() {
    const file = await input({
        message: 'Input video file:',
        validate: (v) => v.trim() !== '' || 'File is required',
    });
    const output = await input({
        message: 'Output filename (leave blank for auto):',
    });
    await runConvert(file, output || undefined);
}

async function promptAudio() {
    const file = await input({
        message: 'Input video file:',
        validate: (v) => v.trim() !== '' || 'File is required',
    });

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

    const output = await input({
        message: 'Output filename (leave blank for auto):',
    });

    await runAudio(file, output || undefined, replace);
}

// ─── Main interactive loop ────────────────────────────────────────────────────

async function interactiveMode() {
    printBanner();

    while (true) {
        const action = await select({
            message: 'What would you like to do?',
            choices: [
                { name: '📂  Join AVI files in a directory', value: 'join' },
                { name: '▶️   Convert video to YouTube format', value: 'convert' },
                { name: '🔇  Strip / replace audio', value: 'audio' },
                new Separator(),
                { name: '🚪  Exit', value: 'exit' },
            ],
        });

        if (action === 'exit') {
            console.log(chalk.dim('\n  Goodbye!\n'));
            break;
        }

        console.log();

        if (action === 'join') await promptJoin();
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
