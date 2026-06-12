import { input } from '@inquirer/prompts';
import { AppContext, defaultContext } from '../../context';
import { browseAndPickFile } from '../../ui';
import { runConvert } from './run';

export async function promptConvert(ctx: AppContext = defaultContext): Promise<void> {
    const file = await browseAndPickFile('Pick a video to convert:', (dir) => ctx.collection.listVideoFiles(dir));
    const output = await input({ message: 'Output filename (leave blank for auto):' });
    await runConvert(file, output || undefined, ctx);
}
