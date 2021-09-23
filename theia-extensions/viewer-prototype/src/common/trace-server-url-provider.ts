export const TRACE_SERVER_DEFAULT_URL = 'http://localhost:{}/tsp/api';
export const TRACE_SERVER_DEFAULT_PORT = '8080';

export const TraceServerUrlProvider = Symbol('TraceServerUrlProvider');
export interface TraceServerUrlProvider {

    /**
     * Get the resolved trace server URL from the server.
     */
    getTraceServerUrlPromise(): Promise<string>;

    /**
     * Get the default trace server URL from the server
     */
    getTraceServerUrl(): string;

    /**
     * Add a listener for trace server url changes
     * @param listener The listener function to be called when the url is
     * changed
     */
    onDidChangeTraceServerUrl(listener: (url: string) => void): void;
}
