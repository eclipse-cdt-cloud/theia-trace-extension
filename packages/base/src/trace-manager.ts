import { Trace } from 'tsp-typescript-client/lib/models/trace';
import { ITspClient } from 'tsp-typescript-client/lib/protocol/tsp-client';
import { Query } from 'tsp-typescript-client/lib/models/query/query';
import { OutputDescriptor } from 'tsp-typescript-client/lib/models/output-descriptor';
import { TspClientResponse } from 'tsp-typescript-client/lib/protocol/tsp-client-response';
import { signalManager } from './signals/signal-manager';

export class TraceManager {
    private fOpenTraces: Map<string, Trace> = new Map();
    private fTspClient: ITspClient;

    constructor(tspClient: ITspClient) {
        this.fTspClient = tspClient;
    }

    /**
     * Get an array of opened traces
     * @returns Array of Trace
     */
    async getOpenedTraces(): Promise<Trace[]> {
        const openedTraces: Array<Trace> = [];
        // Look on the server for opened trace
        const tracesResponse = await this.fTspClient.fetchTraces();
        const traces = tracesResponse.getModel();
        if (tracesResponse.isOk() && traces) {
            openedTraces.push(...traces);
        }
        return openedTraces;
    }

    /**
     * Get a specific trace information
     * @param traceUUID Trace UUID
     */
    async getTrace(traceUUID: string): Promise<Trace | undefined> {
        // Check if the trace is in "cache"
        let trace = this.fOpenTraces.get(traceUUID);

        // If the trace is undefined, check on the server
        if (!trace) {
            const traceResponse = await this.fTspClient.fetchTrace(traceUUID);
            if (traceResponse.isOk()) {
                trace = traceResponse.getModel();
            }
        }
        return trace;
    }

    /**
     * Get an array of OutputDescriptor for a given trace
     * @param traceUUID Trace UUID
     */
    async getAvailableOutputs(traceUUID: string): Promise<OutputDescriptor[] | undefined> {
        // Check if the trace is opened
        const trace = this.fOpenTraces.get(traceUUID);
        if (trace) {
            const outputsResponse = await this.fTspClient.experimentOutputs(trace.UUID);
            return outputsResponse.getModel();
        }
        return undefined;
    }

    /**
     * Open a given trace on the server
     * @param traceURI Trace URI to open
     * @param traceName Optional name for the trace. If not specified the URI name is used
     * @returns The opened trace
     */
    async openTrace(traceURI: string, traceName?: string): Promise<Trace | undefined> {
        const name = traceName ? traceName : traceURI.replace(/\/$/, '').replace(/(.*\/)?/, '');

        const tryOpen = async function (tspClient: ITspClient, retry: number): Promise<TspClientResponse<Trace>> {
            return tspClient.openTrace(
                new Query({
                    name: retry === 0 ? name : name + '(' + retry + ')',
                    uri: traceURI
                })
            );
        };
        let tryNb = 0;
        let traceResponse: TspClientResponse<Trace> | undefined;
        while (traceResponse === undefined || traceResponse.getStatusCode() === 409) {
            traceResponse = await tryOpen(this.fTspClient, tryNb);
            tryNb++;
        }
        const trace = traceResponse.getModel();
        if (traceResponse.isOk() && trace) {
            this.addTrace(trace);
            signalManager().emit('TRACE_OPENED', trace);
            return trace;
        }
        // TODO Handle trace open errors
        return undefined;
    }

    /**
     * Update the trace with the latest info from the server.
     * @param traceName Trace name to update
     * @returns The updated trace or undefined if the trace was not open previously
     */
    async updateTrace(traceUUID: string): Promise<Trace | undefined> {
        const currentTrace = this.fOpenTraces.get(traceUUID);
        if (currentTrace) {
            const traceResponse = await this.fTspClient.fetchTrace(currentTrace.UUID);
            const trace = traceResponse.getModel();
            if (trace && traceResponse.isOk()) {
                this.fOpenTraces.set(traceUUID, trace);
                return trace;
            }
        }

        return undefined;
    }

    /**
     * Delete the given trace on the server
     * @param traceUUID Trace UUID
     */
    async deleteTrace(traceUUID: string): Promise<void> {
        const traceToClose = this.fOpenTraces.get(traceUUID);
        if (traceToClose) {
            const deleteResponse = await this.fTspClient.deleteTrace(traceUUID);
            if (deleteResponse.getStatusCode() !== 409) {
                const deletedTrace = this.removeTrace(traceUUID);
                if (deletedTrace) {
                    signalManager().emit('TRACE_DELETED', { trace: deletedTrace });
                }
            }
        }
    }

    public addTrace(trace: Trace): void {
        this.fOpenTraces.set(trace.UUID, trace);
    }

    private removeTrace(traceUUID: string): Trace | undefined {
        const deletedTrace = this.fOpenTraces.get(traceUUID);
        this.fOpenTraces.delete(traceUUID);
        return deletedTrace;
    }
}
