export const TRACE_SERVER_DEFAULT_URL = 'http://localhost:{}/tsp/api';
export const TRACE_VIEWER_DEFAULT_PORT = 8080;

export const TraceServerUrlProvider = Symbol('TraceServerUrlProvider');
export interface TraceServerUrlProvider {

    /**
     * Get a promise that resolves once the Trace Server URL is initialized.
     * @returns a new promise each time `.onDidChangeTraceServerUrl` fires.
     */
    getTraceServerUrlPromise(): Promise<string>;

    /**
     * Get the default Trace Server URL from the server.
     * Will throw if called before initialization. See `getTraceServerUrlPromise`
     * to get a promise to the value.
     */
    getTraceServerUrl(): string;

    /**
     * Get notified when the Trace Server URL changes.
     * @param listener function to be called when the url is changed.
     */
    onDidChangeTraceServerUrl(listener: (url: string) => void): void;
}
