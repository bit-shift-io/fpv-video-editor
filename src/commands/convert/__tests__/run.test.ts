import { describe, it, expect, vi } from 'vitest';
import * as path from 'path';
import { runConvert } from '../run';
import { makeCtx } from '../../../test-helpers';

describe('runConvert', () => {
    it('resolves input and output paths to absolute', async () => {
        const { ctx } = makeCtx();
        await runConvert('videos/clip.avi', 'out/result.mp4', ctx);
        expect(ctx.processor.convertToYouTube).toHaveBeenCalledWith(
            path.resolve('videos/clip.avi'),
            path.resolve('out/result.mp4'),
        );
    });

    it('auto-generates _yt.mp4 output name when none supplied', async () => {
        const { ctx } = makeCtx();
        await runConvert('clip.avi', undefined, ctx);
        expect(ctx.processor.convertToYouTube).toHaveBeenCalledWith(
            path.resolve('clip.avi'),
            path.resolve('clip_yt.mp4'),
        );
    });

    it('calls spinner.fail when processor rejects', async () => {
        const { ctx, spinner } = makeCtx();
        vi.mocked(ctx.processor.convertToYouTube).mockRejectedValue(new Error('encode failed'));
        await runConvert('clip.avi', undefined, ctx);
        expect(spinner.fail).toHaveBeenCalled();
    });
});
