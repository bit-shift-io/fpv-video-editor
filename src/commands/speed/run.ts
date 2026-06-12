import chalk from 'chalk';
import * as path from 'path';
import { AppContext, defaultContext } from '../../context';

export async function runSpeed(
    file: string,
    speed: number,
    output?: string,
    ctx: AppContext = defaultContext,
): Promise<void> {
    const inputPath = path.resolve(file);
    const suffix = speed < 1.0 ? '_slow' : '_fast';
    const outputPath = path.resolve(output || file.replace(/\.[^/.]+$/, '') + suffix + '.avi');
    const spinner = ctx.ora(chalk.blue(`Changing playback speed of ${path.basename(file)} to ${speed}x...`)).start();
    try {
        await ctx.processor.changeSpeed(inputPath, outputPath, speed);
        spinner.succeed(chalk.green(`Successfully changed speed into ${outputPath}`));
    } catch (error: any) {
        spinner.fail(chalk.red(`Speed modification failed: ${error.message}`));
    }
}
