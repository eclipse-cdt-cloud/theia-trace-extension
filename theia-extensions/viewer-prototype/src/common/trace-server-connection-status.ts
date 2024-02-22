export const TraceServerConnectionStatusBackend = Symbol('TraceServerConnectionStatusBackend');

export const TRACE_SERVER_CONNECTION_STATUS = '/services/theia-trace-extension/trace-server-connection-status';

export interface TraceServerConnectionStatusBackend {
    /**
     * Add a new TraceServerConnectionStatusClient to be notified on status changes.
     * @param client the client to be notified.
     */
    addClient(client: TraceServerConnectionStatusClient): void;
    /**
     * Remove a new TraceServerConnectionStatusClient so it won't no longer be notified on status changes.
     * @param client the client to be removed.
     */
    removeClient(client: TraceServerConnectionStatusClient): void;

    /**
     * Get the current status of the trace server
     */
    getStatus(): Promise<boolean>;
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
    activate(): void;
    /**
     * Unsubscribe this client from the connection status
     */
    deactivate(): void;

    /**
     * Adds event listener for server status change
     * @param fn event listener
     */
    addServerStatusChangeListener(fn: (status: boolean) => void): void;

    /**
     * Removes event listener for server status change.
     * @param fn event listener to be removed
     */
    removeServerStatusChangeListener(fn: (status: boolean) => void): void;

    /**
     * Get the status of the server
     */
    getStatus(): boolean;
}
