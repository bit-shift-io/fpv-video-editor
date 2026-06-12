import { select, input } from '@inquirer/prompts';
import { AppContext, defaultContext } from '../../context';
import { browseAndPickFile } from '../../ui';
import { runAudio } from './run';

export async function promptAudio(ctx: AppContext = defaultContext): Promise<void> {
    const file = await browseAndPickFile('Pick a video to process:', (dir) => ctx.collection.listVideoFiles(dir));

    const mode = await select({
        message: 'What would you like to do?',
        choices: [
            { name: 'Strip audio', value: 'strip' },
            { name: 'Replace audio', value: 'replace' },
        ],
    });

    let replace: string[] | undefined;
    if (mode === 'replace') {
        const audioFiles = await input({
            message: 'Audio file(s) to use (comma-separated):',
            validate: (v) => v.trim() !== '' || 'At least one audio file is required',
        });
        replace = audioFiles.split(',').map((s: string) => s.trim()).filter(Boolean);
    }

    const output = await input({ message: 'Output filename (leave blank for auto):' });
    await runAudio(file, output || undefined, replace, ctx);
}
