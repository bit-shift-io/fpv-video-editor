import chalk from 'chalk';
import * as path from 'path';
import { AppContext, defaultContext } from '../../context';

export async function runJoin(
    directoryOrFiles: string | string[],
    output: string,
    target?: { width: number; height: number },
    ctx: AppContext = defaultContext,
): Promise<void> {
    const spinner = ctx.ora(chalk.blue('Joining videos...')).start();
    try {
        const outputPath = path.resolve(output);
        if (typeof directoryOrFiles === 'string') {
            await ctx.processor.joinVideos(path.resolve(directoryOrFiles), outputPath, target);
        } else {
            await ctx.processor.joinVideos(directoryOrFiles, outputPath, target);
        }
        spinner.succeed(chalk.green(`Successfully joined videos into ${outputPath}`));
    } catch (error: any) {
        spinner.fail(chalk.red(`Failed to join videos: ${error.message}`));
    }
}
