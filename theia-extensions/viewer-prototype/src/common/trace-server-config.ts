import { ApplicationError } from '@theia/core';

export const traceServerPath = '/services/theia-trace-extension/trace-server-config';
export const PortBusy = ApplicationError.declare(-32650, code => ({
    message: 'Port busy',
    data: { code }
}));

export interface StartTraceServerOptions {
    path?: string
    args?: string
}

export const TraceServerConfigService = Symbol('TraceServerConfigService');
export interface TraceServerConfigService {

    /**
     * Spawn the trace server from a given path
     */
    startTraceServer(options?: StartTraceServerOptions): Promise<string>;

    /**
     * Stop the trace server
     */
    stopTraceServer(): Promise<string>;
}
