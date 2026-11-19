import { describe, it, expect, vi } from 'vitest';
import * as path from 'path';
import { runJoin } from '../run';
import { makeCtx } from '../../../test-helpers';

describe('runJoin', () => {
    it('resolves directory string before passing to processor', async () => {
        const { ctx } = makeCtx();
        await runJoin('relative/dir', 'out.avi', undefined, ctx);
        expect(ctx.processor.joinVideos).toHaveBeenCalledWith(
            path.resolve('relative/dir'),
            path.resolve('out.avi'),
            undefined,
        );
    });

    it('passes file array directly to processor', async () => {
        const { ctx } = makeCtx();
        const files = ['/abs/a.avi', '/abs/b.avi'];
        await runJoin(files, 'out.avi', undefined, ctx);
        expect(ctx.processor.joinVideos).toHaveBeenCalledWith(
            files,
            path.resolve('out.avi'),
            undefined,
        );
    });

    it('forwards optional target resolution to processor', async () => {
        const { ctx } = makeCtx();
        const target = { width: 1920, height: 1080 };
        await runJoin(['/a.avi'], 'out.avi', target, ctx);
        expect(ctx.processor.joinVideos).toHaveBeenCalledWith(
            ['/a.avi'],
            path.resolve('out.avi'),
            target,
        );
    });

    it('calls spinner.fail when processor rejects', async () => {
        const { ctx, spinner } = makeCtx();
        vi.mocked(ctx.processor.joinVideos).mockRejectedValue(new Error('ffmpeg failed'));
        await runJoin(['/a.avi'], 'out.avi', undefined, ctx);
        expect(spinner.fail).toHaveBeenCalled();
    });
});
