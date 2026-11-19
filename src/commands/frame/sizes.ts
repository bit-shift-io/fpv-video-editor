export type FrameRes = 720 | 1080;
export type FrameSize = 'original' | 'halfway' | 'maximum';
export const FRAME_SIZES: FrameSize[] = ['original', 'halfway', 'maximum'];

export interface Dimensions {
    width: number;
    height: number;
}

export type FrameSizesResult =
    | { ok: true; output: Dimensions; sizes: Record<FrameSize, Dimensions> }
    | { ok: false; reason: string };

const OUTPUTS: Record<FrameRes, Dimensions> = {
    720: { width: 1280, height: 720 },
    1080: { width: 1920, height: 1080 },
};

const floorEven = (n: number) => Math.floor(n / 2) * 2;
const roundEven = (n: number) => Math.round(n / 2) * 2;

/**
 * Works out how large a clip can be drawn inside a 720p/1080p frame.
 * All returned dimensions are even (H.264 requirement).
 */
export function computeFrameSizes(clipW: number, clipH: number, res: FrameRes): FrameSizesResult {
    const output = OUTPUTS[res];
    if (clipW > output.width || clipH > output.height) {
        return {
            ok: false,
            reason: `Clip is ${clipW}x${clipH}, larger than the ${output.width}x${output.height} output.`,
        };
    }
    const original = { width: floorEven(clipW), height: floorEven(clipH) };
    const scale = Math.min(output.width / clipW, output.height / clipH);
    const maximum = { width: floorEven(clipW * scale), height: floorEven(clipH * scale) };
    const halfway = {
        width: roundEven((original.width + maximum.width) / 2),
        height: roundEven((original.height + maximum.height) / 2),
    };
    return { ok: true, output, sizes: { original, halfway, maximum } };
}
