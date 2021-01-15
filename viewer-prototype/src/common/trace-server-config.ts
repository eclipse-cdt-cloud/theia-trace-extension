import { ApplicationError } from '@theia/core';

export const traceServerPath = '/services/trace-server-config';
export const TraceServerConfigService = Symbol('TraceServerConfigService');
export const PortBusy = ApplicationError.declare(-32650, code => ({
    message: 'Port busy',
    data: { code }
}));
export interface TraceServerConfigService {
    /**
     * Spawn the trace server from a given path
     */
    startTraceServer(path: string | undefined, port: number | undefined): Promise<string>;

    /**
     * Stop the trace server
     */
    stopTraceServer(): Promise<string>;
}

