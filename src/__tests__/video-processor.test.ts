import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('fluent-ffmpeg');
import ffmpeg from 'fluent-ffmpeg';
import { extractClip } from '../video-processor';

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
