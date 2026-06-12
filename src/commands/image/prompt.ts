import { input } from '@inquirer/prompts';
import { AppContext, defaultContext } from '../../context';
import { browseAndPickFile } from '../../ui';
import { runImageToVideo } from './run';

export async function promptImageToVideo(ctx: AppContext = defaultContext): Promise<void> {
    const file = await browseAndPickFile('Pick an image:', (dir) => ctx.collection.listImageFiles(dir), '🖼️');

    const durationStr = await input({
        message: 'Video duration in seconds (e.g. 5, 10.5):',
        validate: (v) => {
            const n = parseFloat(v);
            if (isNaN(n) || n <= 0) return 'Please enter a duration greater than 0';
            return true;
        },
    });

    const output = await input({ message: 'Output filename (leave blank for auto):' });
    await runImageToVideo(file, parseFloat(durationStr), output || undefined, ctx);
}
