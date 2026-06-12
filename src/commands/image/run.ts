import chalk from 'chalk';
import * as path from 'path';
import { AppContext, defaultContext } from '../../context';

export async function runImageToVideo(
    file: string,
    duration: number,
    output?: string,
    ctx: AppContext = defaultContext,
): Promise<void> {
    const inputPath = path.resolve(file);
    const ext = path.extname(file) || '.mp4';
    const base = path.basename(file, ext);
    const dir = path.dirname(inputPath);
    const autoName = `${base}_${duration}s${ext.replace(/\.[^/.]+$/, '')}.mp4`;
    const outputPath = path.resolve(output || path.join(dir, autoName));
    const spinner = ctx.ora(chalk.blue(`Creating ${duration}s video from ${path.basename(file)}...`)).start();
    try {
        await ctx.processor.imageToVideo(inputPath, duration, outputPath);
        spinner.succeed(chalk.green(`Video created at ${outputPath}`));
    } catch (error: any) {
        spinner.fail(chalk.red(`Video creation failed: ${error.message}`));
    }
}
