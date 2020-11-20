
export const traceServerPath = '/services/trace-server-config';
export const TraceServerConfigService = Symbol('TraceServerConfigService');
export interface TraceServerConfigService {
    /**
     * Spawn the trace server from a given path
     */
    startTraceServer(path: string | undefined, port: number | undefined): Promise<void>;

    /**
     * Stop the trace server
     */
    stopTraceServer(port: number | undefined): Promise<void>;
}

