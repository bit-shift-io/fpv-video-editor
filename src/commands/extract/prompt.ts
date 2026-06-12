import { input } from '@inquirer/prompts';
import { AppContext, defaultContext } from '../../context';
import { browseAndPickFile } from '../../ui';
import { runExtract, validateTime } from './run';

export async function promptExtract(ctx: AppContext = defaultContext): Promise<void> {
    const file = await browseAndPickFile('Pick a video to extract from:', (dir) => ctx.collection.listVideoFiles(dir));

    const startTime = await input({
        message: 'Start time (HH:MM:SS, MM:SS, or seconds):',
        validate: validateTime,
    });
    const endTime = await input({
        message: 'End time   (HH:MM:SS, MM:SS, or seconds):',
        validate: validateTime,
    });

    const output = await input({ message: 'Output filename (leave blank for auto):' });
    await runExtract(file, startTime, endTime, output || undefined, ctx);
}
