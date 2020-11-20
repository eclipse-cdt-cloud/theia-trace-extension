export const TraceServerUrlProvider = Symbol('TraceServerUrlProvider');
export const TRACE_SERVER_DEFAULT_URL = 'http://localhost:{}/tsp/api';
export const TRACE_SERVER_DEFAULT_PORT = '8080';

export interface TraceServerUrlProvider {

    /**
     * Get the default trace server URL from the server
     */
    getTraceServerUrl(): Readonly<string>;

    /**
     * Add a listener for trace server url changes
     * @param listener The listener function to be called when the url is
     * changed
     */
    addTraceServerUrlChangedListener(listener: (url: string) => void): void;

}
