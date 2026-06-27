#!/usr/bin/env ts-node
import { Command } from 'commander';
import { select, Separator } from '@inquirer/prompts';
import chalk from 'chalk';
import { printBanner } from './ui';
import { AppContext, defaultContext } from './context';
import { runJoin, promptJoin } from './commands/join';
import { runConvert, promptConvert } from './commands/convert';
import { runExtract, promptExtract } from './commands/extract';
import { runAudio, promptAudio } from './commands/audio';
import { runSpeed, promptSpeed } from './commands/speed';
import { runImageToVideo, promptImageToVideo } from './commands/image';
import { runBulkExtract, promptBulkExtract } from './commands/bulk-extract';

// ─── Main interactive loop ────────────────────────────────────────────────────

async function interactiveMode(ctx: AppContext = defaultContext) {
    printBanner();

    while (true) {
        const choices: any[] = [
            { name: '📂  Join videos', value: 'join' },
            { name: '✂️   Extract clip', value: 'extract' },
            { name: '✂️   Bulk extract clips', value: 'bulk-extract' },
            { name: '⏩  Modify playback speed', value: 'speed' },
            { name: '🖼️  Create video from image', value: 'image' },
            { name: '🔇  Strip / replace audio', value: 'audio' },
            
            { name: '▶️  Convert to YouTube format', value: 'convert' },
            new Separator(),
            { name: '🚪  Exit', value: 'exit' },
        ];

        const action = await select({ message: 'What would you like to do?', choices });

        if (action === 'exit') {
            console.log(chalk.dim('\n  Goodbye!\n'));
            break;
        }

        console.log();

        if (action === 'join') await promptJoin(ctx);
        else if (action === 'extract') await promptExtract(ctx);
        else if (action === 'speed') await promptSpeed(ctx);
        else if (action === 'image') await promptImageToVideo(ctx);
        else if (action === 'convert') await promptConvert(ctx);
        else if (action === 'audio') await promptAudio(ctx);
        else if (action === 'bulk-extract') await promptBulkExtract(ctx);

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
    .command('bulk-extract')
    .description('Extract multiple clips from a bulk text file')
    .argument('<file>', 'Path to bulk text file')
    .action(async (file) => {
        await runBulkExtract(file);
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

const hasSubCommand = process.argv.slice(2).length > 0;

if (hasSubCommand) {
    program.parse(process.argv);
} else {
    interactiveMode();
}
