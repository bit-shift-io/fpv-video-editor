import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('fluent-ffmpeg');
import ffmpeg from 'fluent-ffmpeg';
import { extractClip, frameVideo } from '../video-processor';

function makeMockChain() {
    const chain: any = {
        inputOptions: vi.fn().mockReturnThis(),
        outputOptions: vi.fn().mockReturnThis(),
        on: vi.fn().mockImplementation((event: string, cb: () => void) => {
            if (event === 'end') cb();
            return chain;
        }),
        save: vi.fn().mockReturnThis(),
    };
    return chain;
}

describe('extractClip', () => {
    let mockChain: ReturnType<typeof makeMockChain>;

    beforeEach(() => {
        mockChain = makeMockChain();
        vi.mocked(ffmpeg).mockReturnValue(mockChain);
    });

    it('passes -ss as an output option so timestamps start at zero', async () => {
        await extractClip('input.avi', '10', '20', 'output.avi');
        const outputOptions: string[] = mockChain.outputOptions.mock.calls.flat(2);
        expect(outputOptions).toContain('-ss 10');
    });

    it('uses -to with the end time so the end frame is included', async () => {
        await extractClip('input.avi', '10', '20', 'output.avi');
        const outputOptions: string[] = mockChain.outputOptions.mock.calls.flat(2);
        expect(outputOptions).toContain('-to 20');
    });

    it('does not seek via input options', async () => {
        await extractClip('input.avi', '10', '20', 'output.avi');
        const inputOptions: string[] = mockChain.inputOptions.mock.calls.flat(2);
        expect(inputOptions.some((o: string) => o.includes('-ss'))).toBe(false);
    });
});

describe('frameVideo', () => {
    let mockChain: any;

    function probeReturns(streams: any[]) {
        (ffmpeg as any).ffprobe = vi.fn((_f: string, cb: (err: any, data: any) => void) => cb(null, { streams, format: { duration: 10 } }));
    }

    beforeEach(() => {
        mockChain = makeMockChain();
        mockChain.input = vi.fn().mockReturnThis();
        mockChain.complexFilter = vi.fn().mockReturnThis();
        vi.mocked(ffmpeg).mockReturnValue(mockChain);
    });

    it('covers the frame with the background and centres the scaled clip on it', async () => {
        probeReturns([{ codec_type: 'video', width: 640, height: 480 }, { codec_type: 'audio' }]);
        await frameVideo('clip.avi', 'bg.jpg', 'out.mp4', 1920, 1080, 1440, 1080);
        expect(mockChain.complexFilter).toHaveBeenCalledWith(
            '[1:v]scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,setsar=1[bg];' +
            '[0:v]scale=1440:1080,setsar=1[fg];' +
            '[bg][fg]overlay=(W-w)/2:(H-h)/2:shortest=1,format=yuv420p[v]',
        );
    });

    it('maps no audio when the clip is silent', async () => {
        probeReturns([{ codec_type: 'video', width: 640, height: 480 }]);
        await frameVideo('clip.avi', 'bg.jpg', 'out.mp4', 1920, 1080, 1440, 1080);
        const outputOptions: string[] = mockChain.outputOptions.mock.calls.flat(2);
        expect(outputOptions.some(o => o.includes('0:a'))).toBe(false);
    });
});
