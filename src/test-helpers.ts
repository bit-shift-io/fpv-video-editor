import { vi } from 'vitest';
import type { AppContext, ISpinner } from './context';

export function makeSpinner(): ISpinner {
    return {
        start: vi.fn().mockReturnThis(),
        succeed: vi.fn().mockReturnThis(),
        fail: vi.fn().mockReturnThis(),
        stop: vi.fn().mockReturnThis(),
    };
}

export function makeCtx(): { ctx: AppContext; spinner: ISpinner } {
    const spinner = makeSpinner();
    const ctx: AppContext = {
        processor: {
            getVideoInfo: vi.fn().mockResolvedValue({ width: 1920, height: 1080, codecName: 'mjpeg', hasAudio: true, duration: 10 }),
            joinVideos: vi.fn().mockResolvedValue(undefined),
            convertToYouTube: vi.fn().mockResolvedValue(undefined),
            processAudio: vi.fn().mockResolvedValue(undefined),
            extractClip: vi.fn().mockResolvedValue(undefined),
            changeSpeed: vi.fn().mockResolvedValue(undefined),
            imageToVideo: vi.fn().mockResolvedValue(undefined),
        },
        collection: {
            listVideoFiles: vi.fn().mockReturnValue([]),
            listImageFiles: vi.fn().mockReturnValue([]),
            listTextFiles: vi.fn().mockReturnValue([]),
            listSubdirectories: vi.fn().mockReturnValue([]),
        },
        ora: vi.fn().mockReturnValue(spinner),
    };
    return { ctx, spinner };
}
