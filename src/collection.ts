import * as fs from 'fs';
import * as path from 'path';

const VIDEO_EXTENSIONS = new Set(['.avi', '.mp4', '.mov', '.mkv', '.m4v', '.wmv', '.flv', '.webm', '.mts', '.m2ts']);
const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.bmp', '.tiff', '.tif']);

export interface IFileCollection {
    listVideoFiles(dir: string): string[];
    listImageFiles(dir: string): string[];
    listSubdirectories(dir: string): string[];
}

export function isVideoFile(filePath: string): boolean {
    return VIDEO_EXTENSIONS.has(path.extname(filePath).toLowerCase());
}

export function listVideoFiles(dir: string): string[] {
    try {
        return fs.readdirSync(dir)
            .filter(f => {
                const full = path.join(dir, f);
                return fs.statSync(full).isFile() && isVideoFile(f);
            })
            .sort()
            .map(f => path.join(dir, f));
    } catch {
        return [];
    }
}

export function listImageFiles(dir: string): string[] {
    try {
        return fs.readdirSync(dir)
            .filter(f => {
                const full = path.join(dir, f);
                return fs.statSync(full).isFile() && IMAGE_EXTENSIONS.has(path.extname(f).toLowerCase());
            })
            .sort()
            .map(f => path.join(dir, f));
    } catch {
        return [];
    }
}

export function listSubdirectories(dir: string): string[] {
    try {
        return fs.readdirSync(dir)
            .filter(f => {
                const full = path.join(dir, f);
                return fs.statSync(full).isDirectory() && !f.startsWith('.');
            })
            .sort()
            .map(f => path.join(dir, f));
    } catch {
        return [];
    }
}

export const fileCollection: IFileCollection = {
    listVideoFiles,
    listImageFiles,
    listSubdirectories,
};
