import { AppContext, defaultContext } from '../../context';
import { browseAndPickFile } from '../../ui';
import { runBulkExtract } from './run';

export async function promptBulkExtract(ctx: AppContext = defaultContext): Promise<void> {
    const file = await browseAndPickFile('Pick a bulk text file:', (dir) => ctx.collection.listTextFiles(dir));
    await runBulkExtract(file, ctx);
}
