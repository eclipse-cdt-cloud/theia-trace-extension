export const TraceServerConnectionStatusBackend = Symbol('TraceServerConnectionStatusBackend');

export const TRACE_SERVER_CONNECTION_STATUS = '/services/theia-trace-extension/trace-server-connection-status';

export interface TraceServerConnectionStatusBackend {
    /**
     * Set a new TraceServerConnectionStatusClient to be notified on status changes.
     * @param client the client to be notified.
     */
    setClient(client: TraceServerConnectionStatusClient): void;
    /**
     * Remove a new TraceServerConnectionStatusClient so it won't no longer be notified on status changes.
     * @param client the client to be removed.
     */
    removeClient(client: TraceServerConnectionStatusClient): void;
}

export const TraceServerConnectionStatusClient = Symbol('TraceServerConnectionStatusClient');

export interface TraceServerConnectionStatusClient {
    /**
     * Update the status on the client.
     * @param status the new value of the status.
     */
    updateStatus(status: boolean): void;
    /**
     * Subscribe this client to the connection status
     */
    addConnectionStatusListener(): void;
    /**
     * Unsubscribe this client from the connection status
     */
    removeConnectionStatusListener(): void;
}
