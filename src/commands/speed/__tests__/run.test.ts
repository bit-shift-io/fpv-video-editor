import { describe, it, expect, vi } from 'vitest';
import * as path from 'path';
import { runSpeed } from '../run';
import { makeCtx } from '../../../test-helpers';

describe('runSpeed', () => {
    it('resolves input and output paths to absolute', async () => {
        const { ctx } = makeCtx();
        await runSpeed('video.avi', 2.0, 'out.avi', ctx);
        expect(ctx.processor.changeSpeed).toHaveBeenCalledWith(
            path.resolve('video.avi'),
            path.resolve('out.avi'),
            2.0,
        );
    });

    it('auto-generates _fast.avi suffix when speed >= 1', async () => {
        const { ctx } = makeCtx();
        await runSpeed('clip.avi', 2.0, undefined, ctx);
        expect(ctx.processor.changeSpeed).toHaveBeenCalledWith(
            path.resolve('clip.avi'),
            path.resolve('clip_fast.avi'),
            2.0,
        );
    });

    it('auto-generates _slow.avi suffix when speed < 1', async () => {
        const { ctx } = makeCtx();
        await runSpeed('clip.avi', 0.5, undefined, ctx);
        expect(ctx.processor.changeSpeed).toHaveBeenCalledWith(
            path.resolve('clip.avi'),
            path.resolve('clip_slow.avi'),
            0.5,
        );
    });

    it('calls spinner.fail when processor rejects', async () => {
        const { ctx, spinner } = makeCtx();
        vi.mocked(ctx.processor.changeSpeed).mockRejectedValue(new Error('speed failed'));
        await runSpeed('clip.avi', 2.0, undefined, ctx);
        expect(spinner.fail).toHaveBeenCalled();
    });
});
