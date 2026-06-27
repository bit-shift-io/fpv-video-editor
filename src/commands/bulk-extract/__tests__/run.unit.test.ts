import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { parseBulkFile, runBulkExtract } from '../run';
import { makeCtx } from '../../../test-helpers';

// ─── parseBulkFile ─────────────────────────────────────────────────────────────

describe('parseBulkFile', () => {
    it('returns empty array for empty input', () => {
        expect(parseBulkFile('')).toEqual([]);
    });

    it('returns empty array for blank-only input', () => {
        expect(parseBulkFile('   \n\n  \n')).toEqual([]);
    });

    it('parses a single video with one clip', () => {
        const content = 'data/PICT0004.AVI\n00:43-01:40\n';
        const result = parseBulkFile(content);
        expect(result).toEqual([
            {
                videoPath: path.resolve('data/PICT0004.AVI'),
                startTime: '00:43',
                endTime: '01:40',
            },
        ]);
    });

    it('parses multiple clips for one video', () => {
        const content = 'data/PICT0004.AVI\n00:43-01:40\n02:26-02:40\n03:03-03:16\n';
        const result = parseBulkFile(content);
        expect(result).toHaveLength(3);
        expect(result[0]).toMatchObject({ startTime: '00:43', endTime: '01:40' });
        expect(result[1]).toMatchObject({ startTime: '02:26', endTime: '02:40' });
        expect(result[2]).toMatchObject({ startTime: '03:03', endTime: '03:16' });
    });

    it('parses multiple videos each with multiple clips', () => {
        const content = [
            'data/PICT0004.AVI',
            '00:43-01:40',
            '02:26-02:40',
            '',
            'data/PICT0005.AVI',
            '00:21-01:29',
            '01:36-02:13',
        ].join('\n');
        const result = parseBulkFile(content);
        expect(result).toHaveLength(4);
        expect(result[0].videoPath).toBe(path.resolve('data/PICT0004.AVI'));
        expect(result[2].videoPath).toBe(path.resolve('data/PICT0005.AVI'));
    });

    it('strips trailing comments from time-range lines', () => {
        const content = 'data/PICT0006.AVI\n0:13-0:50 really good! this is a comment\n';
        const result = parseBulkFile(content);
        expect(result).toEqual([
            {
                videoPath: path.resolve('data/PICT0006.AVI'),
                startTime: '0:13',
                endTime: '0:50',
            },
        ]);
    });

    it('handles plain-second time formats', () => {
        const content = 'video.mp4\n90-120\n';
        const result = parseBulkFile(content);
        expect(result).toEqual([
            { videoPath: path.resolve('video.mp4'), startTime: '90', endTime: '120' },
        ]);
    });

    it('handles HH:MM:SS time formats', () => {
        const content = 'video.mp4\n01:30:00-01:45:00\n';
        const result = parseBulkFile(content);
        expect(result).toEqual([
            { videoPath: path.resolve('video.mp4'), startTime: '01:30:00', endTime: '01:45:00' },
        ]);
    });

    it('skips blank lines between blocks', () => {
        const content = '\ndata/PICT0004.AVI\n\n00:43-01:40\n\n';
        const result = parseBulkFile(content);
        expect(result).toHaveLength(1);
    });

    it('produces no clips for a video path with no time-range lines', () => {
        const content = 'data/PICT0004.AVI\ndata/PICT0005.AVI\n00:21-01:29\n';
        const result = parseBulkFile(content);
        expect(result).toHaveLength(1);
        expect(result[0].videoPath).toBe(path.resolve('data/PICT0005.AVI'));
    });

    it('resolves video paths relative to process.cwd()', () => {
        const content = 'relative/path/video.avi\n00:10-00:20\n';
        const result = parseBulkFile(content);
        expect(result[0].videoPath).toBe(path.resolve('relative/path/video.avi'));
        expect(path.isAbsolute(result[0].videoPath)).toBe(true);
    });
});

// ─── runBulkExtract ────────────────────────────────────────────────────────────

describe('runBulkExtract', () => {
    let tmpFile: string;
    let consoleSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        tmpFile = path.join(os.tmpdir(), `bulk-extract-test-${process.pid}.txt`);
        consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
        vi.restoreAllMocks();
        try { fs.unlinkSync(tmpFile); } catch {}
    });

    it('calls extractClip once per clip in order', async () => {
        fs.writeFileSync(tmpFile, 'data/vid.avi\n00:10-00:20\n00:30-00:40\n');
        const { ctx } = makeCtx();

        await runBulkExtract(tmpFile, ctx);

        const calls = vi.mocked(ctx.processor.extractClip).mock.calls;
        expect(calls).toHaveLength(2);
        expect(calls[0][1]).toBe('00:10');
        expect(calls[0][2]).toBe('00:20');
        expect(calls[1][1]).toBe('00:30');
        expect(calls[1][2]).toBe('00:40');
    });

    it('continues processing remaining clips when one fails', async () => {
        fs.writeFileSync(tmpFile, 'data/vid.avi\n00:10-00:20\n00:30-00:40\n00:50-01:00\n');
        const { ctx } = makeCtx();
        vi.mocked(ctx.processor.extractClip)
            .mockResolvedValueOnce(undefined)
            .mockRejectedValueOnce(new Error('bad timestamp'))
            .mockResolvedValueOnce(undefined);

        await runBulkExtract(tmpFile, ctx);

        expect(vi.mocked(ctx.processor.extractClip)).toHaveBeenCalledTimes(3);
    });

    it('prints a summary line with the clip count', async () => {
        fs.writeFileSync(tmpFile, 'data/vid.avi\n00:10-00:20\n00:30-00:40\n');
        const { ctx } = makeCtx();

        await runBulkExtract(tmpFile, ctx);

        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('2 clips processed'));
    });

    it('prints summary with 0 clips when file is empty', async () => {
        fs.writeFileSync(tmpFile, '');
        const { ctx } = makeCtx();

        await runBulkExtract(tmpFile, ctx);

        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('0 clips processed'));
    });
});
