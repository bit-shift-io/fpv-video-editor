import { input, select } from '@inquirer/prompts';
import chalk from 'chalk';
import * as path from 'path';
import { AppContext, defaultContext } from '../../context';
import { browseAndPickFile } from '../../ui';
import { runFrameVideo } from './run';
import { computeFrameSizes, FRAME_SIZES, FrameRes, FrameSize } from './sizes';

const LABELS: Record<FrameSize, string> = { original: 'Original', halfway: 'Halfway', maximum: 'Maximum' };

export async function promptFrameVideo(ctx: AppContext = defaultContext): Promise<void> {
    const video = await browseAndPickFile('Pick a clip:', (dir) => ctx.collection.listVideoFiles(dir), '🎞️');
    const info = await ctx.processor.getVideoInfo(path.resolve(video));
    console.log(chalk.cyan(`  Clip resolution: ${info.width}×${info.height}`));

    const background = await browseAndPickFile('Pick a background image:', (dir) => ctx.collection.listImageFiles(dir), '🖼️');

    const res = await select<FrameRes>({
        message: 'Output resolution:',
        choices: [
            { name: '1080p (1920×1080)', value: 1080 },
            { name: '720p (1280×720)', value: 720 },
        ],
    });

    const result = computeFrameSizes(info.width, info.height, res);
    if ('reason' in result) {
        console.error(chalk.red(result.reason));
        return;
    }

    const size = await select<FrameSize>({
        message: 'Clip size:',
        choices: FRAME_SIZES.map((s) => ({
            name: `${LABELS[s]} (${result.sizes[s].width}×${result.sizes[s].height})`,
            value: s,
        })),
    });

    const output = await input({ message: 'Output filename (leave blank for auto):' });
    await runFrameVideo(video, background, res, size, output || undefined, ctx);
}
