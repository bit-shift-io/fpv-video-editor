import { describe, it, expect, vi } from 'vitest';
import * as path from 'path';
import { runExtract, validateTime, timeToFilePart } from '../run';
import { makeCtx } from '../../../test-helpers';

describe('timeToFilePart', () => {
    it('replaces colons with hyphens', () => {
        expect(timeToFilePart('00:01:30')).toBe('00-01-30');
    });

    it('leaves strings without colons unchanged', () => {
        expect(timeToFilePart('90')).toBe('90');
    });
});

describe('validateTime', () => {
    it('accepts plain seconds', () => {
        expect(validateTime('90')).toBe(true);
    });

    it('accepts decimal seconds', () => {
        expect(validateTime('1.5')).toBe(true);
    });

    it('accepts MM:SS', () => {
        expect(validateTime('1:30')).toBe(true);
    });

    it('accepts HH:MM:SS', () => {
        expect(validateTime('01:30:00')).toBe(true);
    });

    it('rejects letters', () => {
        expect(validateTime('abc')).toMatch(/valid time/);
    });

    it('rejects partial colons', () => {
        expect(validateTime('1:')).toMatch(/valid time/);
    });
});

describe('runExtract', () => {
    it('calls processor with resolved paths and timestamps', async () => {
        const { ctx } = makeCtx();
        await runExtract('video.avi', '0:10', '0:30', 'out.avi', ctx);
        expect(ctx.processor.extractClip).toHaveBeenCalledWith(
            path.resolve('video.avi'),
            '0:10',
            '0:30',
            path.resolve('out.avi'),
        );
    });

    it('auto-names output using timeToFilePart on both timestamps', async () => {
        const { ctx } = makeCtx();
        await runExtract('/abs/clip.avi', '00:01:00', '00:02:30', undefined, ctx);
        expect(ctx.processor.extractClip).toHaveBeenCalledWith(
            '/abs/clip.avi',
            '00:01:00',
            '00:02:30',
            path.join('/abs', 'clip_00-01-00_00-02-30.avi'),
        );
    });

    it('preserves original file extension in auto-name', async () => {
        const { ctx } = makeCtx();
        await runExtract('/abs/clip.mp4', '0', '5', undefined, ctx);
        const call = vi.mocked(ctx.processor.extractClip).mock.calls[0];
        expect(call[3]).toMatch(/\.mp4$/);
    });

    it('calls spinner.fail when processor rejects', async () => {
        const { ctx, spinner } = makeCtx();
        vi.mocked(ctx.processor.extractClip).mockRejectedValue(new Error('cut failed'));
        await runExtract('video.avi', '0', '5', 'out.avi', ctx);
        expect(spinner.fail).toHaveBeenCalled();
    });
});
