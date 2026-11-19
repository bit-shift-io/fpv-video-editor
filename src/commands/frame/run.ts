import chalk from 'chalk';
import * as path from 'path';
import { AppContext, defaultContext } from '../../context';
import { computeFrameSizes, FrameRes, FrameSize } from './sizes';

export async function runFrameVideo(
    video: string,
    background: string,
    res: FrameRes,
    size: FrameSize,
    output?: string,
    ctx: AppContext = defaultContext,
): Promise<void> {
    const videoPath = path.resolve(video);
    const backgroundPath = path.resolve(background);
    const outputPath = path.resolve(output || video.replace(/\.[^/.]+$/, '') + `_${res}p.mp4`);

    const info = await ctx.processor.getVideoInfo(videoPath);
    const result = computeFrameSizes(info.width, info.height, res);
    if ('reason' in result) {
        console.error(chalk.red(result.reason));
        return;
    }
    const clip = result.sizes[size];

    const spinner = ctx.ora(chalk.blue(`Framing ${path.basename(video)} at ${res}p (${size})...`)).start();
    try {
        await ctx.processor.frameVideo(
            videoPath, backgroundPath, outputPath,
            result.output.width, result.output.height, clip.width, clip.height,
        );
        spinner.succeed(chalk.green(`Successfully framed video into ${outputPath}`));
    } catch (error: any) {
        spinner.fail(chalk.red(`Framing failed: ${error.message}`));
    }
}
