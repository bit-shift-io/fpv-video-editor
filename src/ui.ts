import { select, input, Separator } from '@inquirer/prompts';
import chalk from 'chalk';
import * as path from 'path';
import { listSubdirectories } from './collection';

export function printBanner() {
    console.log(chalk.cyan.bold('\n  🎬  FPV Video Editor'));
    console.log(chalk.dim('  ─────────────────────────────\n'));
}

export async function browseAndPickFile(
    message: string,
    listFiles: (dir: string) => string[],
    fileIcon = '🎞',
): Promise<string> {
    let currentDir = process.cwd();

    while (true) {
        const subdirs = listSubdirectories(currentDir);
        const files = listFiles(currentDir);
        const parentDir = path.dirname(currentDir);
        const choices: any[] = [];

        if (parentDir !== currentDir) {
            choices.push({ name: chalk.dim('⬆   .. (go up)'), value: '__UP__' });
        }
        if (subdirs.length > 0) {
            choices.push(new Separator(chalk.dim('── Directories ──')));
            for (const d of subdirs) {
                choices.push({ name: `📁  ${path.basename(d)}`, value: `__DIR__:${d}` });
            }
        }
        if (files.length > 0) {
            choices.push(new Separator(chalk.dim('── Files ──')));
            for (const f of files) {
                choices.push({ name: `${fileIcon}   ${path.basename(f)}`, value: f });
            }
        }
        choices.push(new Separator());
        choices.push({ name: chalk.dim('✏️   Enter path manually'), value: '__MANUAL__' });

        console.log(chalk.dim(`\n  📂  ${currentDir}`));
        const picked = await select({ message, choices, pageSize: 20 });

        if (picked === '__MANUAL__') {
            return await input({
                message: 'File path:',
                validate: (v) => v.trim() !== '' || 'File is required',
            });
        } else if (picked === '__UP__') {
            currentDir = parentDir;
        } else if (typeof picked === 'string' && picked.startsWith('__DIR__:')) {
            currentDir = picked.slice('__DIR__:'.length);
        } else {
            return picked as string;
        }
    }
}

export async function browseAndPickFiles(
    message: string,
    listFiles: (dir: string) => string[],
): Promise<string[]> {
    let currentDir = process.cwd();
    const selected: string[] = [];

    while (true) {
        const subdirs = listSubdirectories(currentDir);
        const files = listFiles(currentDir);
        const parentDir = path.dirname(currentDir);
        const choices: any[] = [];

        if (parentDir !== currentDir) {
            choices.push({ name: chalk.dim('⬆   .. (go up)'), value: '__UP__' });
        }
        if (subdirs.length > 0) {
            choices.push(new Separator(chalk.dim('── Directories ──')));
            for (const d of subdirs) {
                choices.push({ name: `📁  ${path.basename(d)}`, value: `__DIR__:${d}` });
            }
        }
        if (files.length > 0) {
            choices.push(new Separator(chalk.dim('── Files ──')));
            choices.push({ name: chalk.green('✅  Add all files here'), value: '__ALL__' });
            for (const f of files) {
                const tick = selected.includes(f) ? chalk.yellow(' ★') : '';
                choices.push({ name: `🎞   ${path.basename(f)}${tick}`, value: f });
            }
        }
        choices.push(new Separator());
        if (selected.length > 0) {
            choices.push({
                name: chalk.green(`🔙  Done (${selected.length} file${selected.length === 1 ? '' : 's'} selected)`),
                value: '__DONE__',
            });
        }
        choices.push({ name: chalk.dim('✏️   Enter path manually'), value: '__MANUAL__' });

        console.log(chalk.dim(`\n  📂  ${currentDir}`));
        const label = selected.length > 0 ? `${message} (${selected.length} selected)` : message;
        const picked = await select({ message: label, choices, pageSize: 20 });

        if (picked === '__DONE__') {
            return selected;
        } else if (picked === '__MANUAL__') {
            const manualPath = await input({
                message: 'File path:',
                validate: (v) => v.trim() !== '' || 'File is required',
            });
            if (!selected.includes(manualPath)) {
                selected.push(manualPath);
                console.log(chalk.green(`  ✔  Added ${path.basename(manualPath)}`));
            }
        } else if (picked === '__UP__') {
            currentDir = parentDir;
        } else if (typeof picked === 'string' && picked.startsWith('__DIR__:')) {
            currentDir = picked.slice('__DIR__:'.length);
        } else if (picked === '__ALL__') {
            for (const f of files) {
                if (!selected.includes(f)) selected.push(f);
            }
            console.log(chalk.green(`  ✔  Added ${files.length} file(s) from this directory.`));
        } else {
            const f = picked as string;
            const idx = selected.indexOf(f);
            if (idx === -1) {
                selected.push(f);
                console.log(chalk.green(`  ✔  Added ${path.basename(f)}`));
            } else {
                selected.splice(idx, 1);
                console.log(chalk.yellow(`  ✖  Removed ${path.basename(f)}`));
            }
        }
    }
}
