import { describe, it, expect, vi } from 'vitest';
import * as path from 'path';
import { runAudio } from '../run';
import { makeCtx } from '../../../test-helpers';

describe('runAudio', () => {
    it('resolves input and output paths to absolute', async () => {
        const { ctx } = makeCtx();
        await runAudio('video.avi', 'out.avi', undefined, ctx);
        expect(ctx.processor.processAudio).toHaveBeenCalledWith(
            path.resolve('video.avi'),
            path.resolve('out.avi'),
            undefined,
        );
    });

    it('auto-generates _processed.avi output name when none supplied', async () => {
        const { ctx } = makeCtx();
        await runAudio('clip.avi', undefined, undefined, ctx);
        expect(ctx.processor.processAudio).toHaveBeenCalledWith(
            path.resolve('clip.avi'),
            path.resolve('clip_processed.avi'),
            undefined,
        );
    });

    it('passes replace array through to processor', async () => {
        const { ctx } = makeCtx();
        const replace = ['/music/track.mp3'];
        await runAudio('clip.avi', undefined, replace, ctx);
        expect(ctx.processor.processAudio).toHaveBeenCalledWith(
            path.resolve('clip.avi'),
            path.resolve('clip_processed.avi'),
            replace,
        );
    });

    it('calls spinner.fail when processor rejects', async () => {
        const { ctx, spinner } = makeCtx();
        vi.mocked(ctx.processor.processAudio).mockRejectedValue(new Error('audio failed'));
        await runAudio('clip.avi', undefined, undefined, ctx);
        expect(spinner.fail).toHaveBeenCalled();
    });
});
