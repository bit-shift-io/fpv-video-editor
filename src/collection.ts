import * as fs from 'fs';
import * as path from 'path';

// ─── In-memory working collection ────────────────────────────────────────────

const VIDEO_EXTENSIONS = new Set(['.avi', '.mp4', '.mov', '.mkv', '.m4v', '.wmv', '.flv', '.webm', '.mts', '.m2ts']);

let workingCollection: string[] = [];

export function getCollection(): string[] {
    return workingCollection;
}

export function setCollection(files: string[]): void {
    workingCollection = [...files];
}

export function addToCollection(files: string[]): void {
    const existing = new Set(workingCollection);
    for (const f of files) {
        if (!existing.has(f)) {
            workingCollection.push(f);
            existing.add(f);
        }
    }
}

export function removeFromCollection(files: string[]): void {
    const toRemove = new Set(files);
    workingCollection = workingCollection.filter(f => !toRemove.has(f));
}

export function clearCollection(): void {
    workingCollection = [];
}

// ─── Filesystem helpers ───────────────────────────────────────────────────────

export function isVideoFile(filePath: string): boolean {
    return VIDEO_EXTENSIONS.has(path.extname(filePath).toLowerCase());
}

/**
 * Returns absolute paths of video files in a directory (non-recursive).
 */
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

/**
 * Returns absolute paths of subdirectories in a directory.
 */
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
