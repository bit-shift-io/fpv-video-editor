import { input } from '@inquirer/prompts';
import { AppContext, defaultContext } from '../../context';
import { browseAndPickFile } from '../../ui';
import { runSpeed } from './run';

export async function promptSpeed(ctx: AppContext = defaultContext): Promise<void> {
    const file = await browseAndPickFile('Pick a video to modify:', (dir) => ctx.collection.listVideoFiles(dir));

    const speedStr = await input({
        message: 'Playback speed (e.g. 0.5 for half speed, 2.0 for double speed):',
        validate: (v) => {
            const n = parseFloat(v);
            if (isNaN(n) || n <= 0) return 'Please enter a speed greater than 0';
            return true;
        },
    });

    const output = await input({ message: 'Output filename (leave blank for auto):' });
    await runSpeed(file, parseFloat(speedStr), output || undefined, ctx);
}
