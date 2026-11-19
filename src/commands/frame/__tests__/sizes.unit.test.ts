import { describe, it, expect } from 'vitest';
import { computeFrameSizes } from '../sizes';

describe('computeFrameSizes', () => {
    it.each([
        [720, { original: [640, 480], halfway: [800, 600], maximum: [960, 720] }],
        [1080, { original: [640, 480], halfway: [1040, 780], maximum: [1440, 1080] }],
    ] as const)('gives the three sizes for a 640x480 clip at %ip', (res, expected) => {
        const result = computeFrameSizes(640, 480, res);
        expect(result).toEqual({
            ok: true,
            output: res === 720 ? { width: 1280, height: 720 } : { width: 1920, height: 1080 },
            sizes: {
                original: { width: expected.original[0], height: expected.original[1] },
                halfway: { width: expected.halfway[0], height: expected.halfway[1] },
                maximum: { width: expected.maximum[0], height: expected.maximum[1] },
            },
        });
    });

    it('makes every dimension even for an odd-sized clip', () => {
        const result = computeFrameSizes(641, 361, 720);
        expect(result).toMatchObject({
            ok: true,
            sizes: {
                original: { width: 640, height: 360 },
                halfway: { width: 960, height: 540 },
                maximum: { width: 1278, height: 720 },
            },
        });
    });

    it.each([
        ['width', 1300, 600],
        ['height', 1000, 800],
    ])('rejects a clip too large in %s for 720p', (_dim, w, h) => {
        const result = computeFrameSizes(w, h, 720);
        expect(result).toEqual({
            ok: false,
            reason: `Clip is ${w}x${h}, larger than the 1280x720 output.`,
        });
    });
});
