import { select, input } from '@inquirer/prompts';
import chalk from 'chalk';
import * as path from 'path';
import { AppContext, defaultContext } from '../../context';
import { browseAndPickFiles } from '../../ui';
import { runJoin } from './run';

export async function promptJoin(ctx: AppContext = defaultContext): Promise<void> {
    const files = await browseAndPickFiles('Pick videos to join:', (dir) => ctx.collection.listVideoFiles(dir));
    if (files.length === 0) {
        console.log(chalk.yellow('  No files selected.'));
        return;
    }

    const spinner = ctx.ora(chalk.dim('Checking video resolutions...')).start();
    const infos = await Promise.all(files.map(f => ctx.processor.getVideoInfo(f)));
    spinner.stop();

    const allSameSize = infos.every(v => v.width === infos[0].width && v.height === infos[0].height);
    const allSameCodec = infos.every(v => v.codecName === infos[0].codecName);

    let target: { width: number; height: number } | undefined;

    if (!allSameSize || !allSameCodec) {
        const sizes = infos.map((v, i) => `  ${chalk.dim(path.basename(files[i]))}  ${v.width}×${v.height} (${v.codecName})`);
        console.log(chalk.yellow('\n  ⚠️  Videos have different resolutions or codecs:'));
        sizes.forEach(s => console.log(s));
        console.log();

        const areas = infos.map(v => v.width * v.height);
        const highestInfo = infos[areas.indexOf(Math.max(...areas))];
        const lowestInfo  = infos[areas.indexOf(Math.min(...areas))];

        const choice = await select({
            message: 'How would you like to handle the size mismatch?',
            choices: [
                { name: `⬆   Upscale to highest   (${highestInfo.width}×${highestInfo.height})`, value: 'high' },
                { name: `⬇   Downscale to lowest  (${lowestInfo.width}×${lowestInfo.height})`,  value: 'low'  },
                { name: `✏️   Custom resolution`,                                                  value: 'custom' },
            ],
        });

        if (choice === 'high') {
            target = { width: highestInfo.width, height: highestInfo.height };
        } else if (choice === 'low') {
            target = { width: lowestInfo.width, height: lowestInfo.height };
        } else {
            const wStr = await input({ message: 'Width (px):', validate: v => (parseInt(v) > 0) || 'Must be a positive number' });
            const hStr = await input({ message: 'Height (px):', validate: v => (parseInt(v) > 0) || 'Must be a positive number' });
            target = { width: parseInt(wStr), height: parseInt(hStr) };
        }
    }

    const output = await input({ message: 'Output filename:', default: 'joined_video.avi' });
    await runJoin(files, output, target, ctx);
}
