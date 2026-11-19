import { describe, it, expect, vi } from 'vitest';
import * as path from 'path';
import { runImageToVideo } from '../run';
import { makeCtx } from '../../../test-helpers';

describe('runImageToVideo', () => {
    it('resolves input path and passes duration to processor', async () => {
        const { ctx } = makeCtx();
        await runImageToVideo('photo.jpg', 5, 'out.mp4', ctx);
        expect(ctx.processor.imageToVideo).toHaveBeenCalledWith(
            path.resolve('photo.jpg'),
            5,
            path.resolve('out.mp4'),
        );
    });

    it('auto-names output as <base>_<duration>s.mp4', async () => {
        const { ctx } = makeCtx();
        await runImageToVideo('/abs/photo.jpg', 10, undefined, ctx);
        expect(ctx.processor.imageToVideo).toHaveBeenCalledWith(
            '/abs/photo.jpg',
            10,
            path.join('/abs', 'photo_10s.mp4'),
        );
    });

    it('calls spinner.fail when processor rejects', async () => {
        const { ctx, spinner } = makeCtx();
        vi.mocked(ctx.processor.imageToVideo).mockRejectedValue(new Error('encode failed'));
        await runImageToVideo('photo.jpg', 5, undefined, ctx);
        expect(spinner.fail).toHaveBeenCalled();
    });
});
