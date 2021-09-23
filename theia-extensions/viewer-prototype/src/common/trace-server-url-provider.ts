export const TRACE_SERVER_DEFAULT_URL = 'http://localhost:{}/tsp/api';
export const TRACE_SERVER_DEFAULT_PORT = '8080';

export const TraceServerUrlProvider = Symbol('TraceServerUrlProvider');
export interface TraceServerUrlProvider {
    /**
     * Get the resolved Trace Server URL from the server.
     */
    getTraceServerUrlPromise(): Promise<string>;

    /**
     * Get the default Trace Server URL from the server.
     */
    getTraceServerUrl(): string;

    /**
     * Get notified when the Trace Server URL changes.
     * @param listener function to be called when the url is changed.
     */
    onDidChangeTraceServerUrl(listener: (url: string) => void): void;
}
