import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import { AppContext, defaultContext } from '../../context';
import { runExtract } from '../extract';

export interface BulkClip {
    videoPath: string;
    startTime: string;
    endTime: string;
}

const TIME_TOKEN = '(?:\\d+(?:\\.\\d+)?|\\d{1,2}:\\d{2}(?::\\d{2})?)';
const RANGE_RE = new RegExp(`^(${TIME_TOKEN})-(${TIME_TOKEN})(?:\\s.*)?$`);

export function parseBulkFile(content: string): BulkClip[] {
    const clips: BulkClip[] = [];
    let currentVideo: string | null = null;

    for (const rawLine of content.split('\n')) {
        const line = rawLine.trim();
        if (!line) continue;

        const match = RANGE_RE.exec(line);
        if (match) {
            if (currentVideo !== null) {
                clips.push({ videoPath: currentVideo, startTime: match[1], endTime: match[2] });
            }
        } else {
            currentVideo = path.resolve(line);
        }
    }

    return clips;
}

export async function runBulkExtract(
    bulkFilePath: string,
    ctx: AppContext = defaultContext,
): Promise<void> {
    const content = fs.readFileSync(bulkFilePath, 'utf-8');
    const clips = parseBulkFile(content);

    for (const clip of clips) {
        await runExtract(clip.videoPath, clip.startTime, clip.endTime, undefined, ctx);
    }

    console.log(chalk.green(`Done — ${clips.length} clips processed.`));
}
