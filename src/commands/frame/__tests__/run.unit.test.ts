import { describe, it, expect, vi } from 'vitest';
import * as path from 'path';
import { runFrameVideo } from '../run';
import { makeCtx } from '../../../test-helpers';

function ctxWithClip(width: number, height: number) {
    const made = makeCtx();
    vi.mocked(made.ctx.processor.getVideoInfo).mockResolvedValue({
        width, height, codecName: 'mjpeg', hasAudio: true, duration: 10,
    });
    return made;
}

describe('runFrameVideo', () => {
    it('frames a 640x480 clip at 1080p maximum into an auto-named mp4 beside the clip', async () => {
        const { ctx } = ctxWithClip(640, 480);
        await runFrameVideo('data/joined_video.avi', 'background.jpg', 1080, 'maximum', undefined, ctx);
        expect(ctx.processor.frameVideo).toHaveBeenCalledWith(
            path.resolve('data/joined_video.avi'),
            path.resolve('background.jpg'),
            path.resolve('data/joined_video_1080p.mp4'),
            1920, 1080, 1440, 1080,
        );
    });

    it('aborts without writing anything when the clip is larger than the output', async () => {
        const { ctx } = ctxWithClip(1920, 1080);
        const err = vi.spyOn(console, 'error').mockImplementation(() => {});
        await runFrameVideo('big.avi', 'bg.jpg', 720, 'original', undefined, ctx);
        expect(ctx.processor.frameVideo).not.toHaveBeenCalled();
        expect(err).toHaveBeenCalledWith(expect.stringContaining('larger than the 1280x720 output'));
        err.mockRestore();
    });

    it('writes to the given output path when one is supplied', async () => {
        const { ctx } = ctxWithClip(640, 480);
        await runFrameVideo('clip.avi', 'bg.jpg', 720, 'halfway', 'out/framed.mp4', ctx);
        expect(ctx.processor.frameVideo).toHaveBeenCalledWith(
            path.resolve('clip.avi'), path.resolve('bg.jpg'), path.resolve('out/framed.mp4'),
            1280, 720, 800, 600,
        );
    });
});
