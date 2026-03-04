#!/usr/bin/env ts-node
import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import * as path from 'path';
import { joinVideos, convertToYouTube, processAudio } from './video-processor';

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
        const spinner = ora(chalk.blue('Joining videos...')).start();
        try {
            const outputPath = path.resolve(options.output);
            await joinVideos(path.resolve(directory), outputPath);
            spinner.succeed(chalk.green(`Successfully joined videos into ${outputPath}`));
        } catch (error: any) {
            spinner.fail(chalk.red(`Failed to join videos: ${error.message}`));
        }
    });

program
    .command('convert')
    .description('Convert AVI to YouTube-ready MP4 format')
    .argument('<file>', 'Input AVI file')
    .option('-o, --output <filename>', 'Output filename')
    .action(async (file, options) => {
        const inputPath = path.resolve(file);
        const outputPath = path.resolve(options.output || file.replace(/\.[^/.]+$/, "") + "_yt.mp4");

        const spinner = ora(chalk.blue(`Converting ${file} to YouTube format...`)).start();
        try {
            await convertToYouTube(inputPath, outputPath);
            spinner.succeed(chalk.green(`Successfully converted to ${outputPath}`));
        } catch (error: any) {
            spinner.fail(chalk.red(`Conversion failed: ${error.message}`));
        }
    });

program
    .command('audio')
    .description('Strip or replace audio in a video file')
    .argument('<file>', 'Input video file')
    .option('-o, --output <filename>', 'Output filename')
    .option('-r, --replace <music...>', 'Replace with these audio file(s)')
    .action(async (file, options) => {
        const inputPath = path.resolve(file);
        const outputPath = path.resolve(options.output || file.replace(/\.[^/.]+$/, "") + "_processed.mp4");

        const action = options.replace ? 'Replacing audio' : 'Stripping audio';
        const spinner = ora(chalk.blue(`${action} in ${file}...`)).start();

        try {
            await processAudio(inputPath, outputPath, options.replace);
            spinner.succeed(chalk.green(`Successfully processed audio into ${outputPath}`));
        } catch (error: any) {
            spinner.fail(chalk.red(`Audio processing failed: ${error.message}`));
        }
    });

program.parse(process.argv);
