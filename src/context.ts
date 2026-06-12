import ora from 'ora';
import { IVideoProcessor, videoProcessor } from './video-processor';
import { IFileCollection, fileCollection } from './collection';

export type { IVideoProcessor, IFileCollection };

export interface ISpinner {
    start(text?: string): this;
    succeed(text?: string): this;
    fail(text?: string): this;
    stop(): this;
}

export type IOra = (text: string) => ISpinner;

export interface AppContext {
    processor: IVideoProcessor;
    collection: IFileCollection;
    ora: IOra;
}

export const defaultContext: AppContext = {
    processor: videoProcessor,
    collection: fileCollection,
    ora: (text) => ora(text) as unknown as ISpinner,
};
