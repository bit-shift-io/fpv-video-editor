import chalk from 'chalk';
import * as path from 'path';
import { AppContext, defaultContext } from '../../context';

export function timeToFilePart(t: string): string {
    return t.replace(/:/g, '-');
}

export function validateTime(v: string): true | string {
    if (/^\d+(\.\d+)?$/.test(v.trim())) return true;
    if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(v.trim())) return true;
    return 'Enter a valid time: HH:MM:SS, MM:SS, or seconds (e.g. 90)';
}

export async function runExtract(
    file: string,
    startTime: string,
    endTime: string,
    output?: string,
    ctx: AppContext = defaultContext,
): Promise<void> {
    const inputPath = path.resolve(file);
    const ext = path.extname(file) || '.mp4';
    const base = path.basename(file, ext);
    const dir = path.dirname(inputPath);
    const autoName = `${base}_${timeToFilePart(startTime)}_${timeToFilePart(endTime)}${ext}`;
    const outputPath = path.resolve(output || path.join(dir, autoName));
    const spinner = ctx.ora(chalk.blue(`Extracting ${startTime} → ${endTime} from ${path.basename(file)}...`)).start();
    try {
        await ctx.processor.extractClip(inputPath, startTime, endTime, outputPath);
        spinner.succeed(chalk.green(`Clip saved to ${outputPath}`));
    } catch (error: any) {
        spinner.fail(chalk.red(`Extraction failed: ${error.message}`));
    }
}
