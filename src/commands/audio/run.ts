import chalk from 'chalk';
import * as path from 'path';
import { AppContext, defaultContext } from '../../context';

export async function runAudio(
    file: string,
    output?: string,
    replace?: string[],
    ctx: AppContext = defaultContext,
): Promise<void> {
    const inputPath = path.resolve(file);
    const outputPath = path.resolve(output || file.replace(/\.[^/.]+$/, '') + '_processed.avi');
    const action = replace && replace.length > 0 ? 'Replacing audio' : 'Stripping audio';
    const spinner = ctx.ora(chalk.blue(`${action} in ${path.basename(file)}...`)).start();
    try {
        await ctx.processor.processAudio(inputPath, outputPath, replace);
        spinner.succeed(chalk.green(`Successfully processed audio into ${outputPath}`));
    } catch (error: any) {
        spinner.fail(chalk.red(`Audio processing failed: ${error.message}`));
    }
}
