import { injectable } from '@theia/core/shared/inversify';
import { dirname, resolve } from 'path';
import { TraceServerServiceImpl } from '../../node/trace-server/trace-server-service';

const APPLICATION_ROOT = resolve(dirname(process.argv0));

export const BUNDLED_TRACE_SERVER_PATH = resolve(
    APPLICATION_ROOT,
    'resources/trace-compass-server/tracecompass-server'
);

@injectable()
export class ElectronTraceServerServiceImpl extends TraceServerServiceImpl {
    protected async findTraceServerPath(): Promise<string | undefined> {
        return (await super.findTraceServerPath()) ?? this.getBundledTraceServerPath();
    }

    /**
     * @returns The path to the bundled server if found on disk and is both readable and exectable, `undefined` otherwise.
     */
    protected async getBundledTraceServerPath(): Promise<string | undefined> {
        return BUNDLED_TRACE_SERVER_PATH;
    }
}
