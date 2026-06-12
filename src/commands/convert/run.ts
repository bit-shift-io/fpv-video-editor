import chalk from 'chalk';
import * as path from 'path';
import { AppContext, defaultContext } from '../../context';

export async function runConvert(
    file: string,
    output?: string,
    ctx: AppContext = defaultContext,
): Promise<void> {
    const inputPath = path.resolve(file);
    const outputPath = path.resolve(output || file.replace(/\.[^/.]+$/, '') + '_yt.mp4');
    const spinner = ctx.ora(chalk.blue(`Converting ${path.basename(file)} to YouTube format...`)).start();
    try {
        await ctx.processor.convertToYouTube(inputPath, outputPath);
        spinner.succeed(chalk.green(`Successfully converted to ${outputPath}`));
    } catch (error: any) {
        spinner.fail(chalk.red(`Conversion failed: ${error.message}`));
    }
}
