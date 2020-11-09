
import { Trace } from 'tsp-typescript-client/lib/models/trace';
import { TspClient } from 'tsp-typescript-client/lib/protocol/tsp-client';
import { Query } from 'tsp-typescript-client/lib/models/query/query';
import { OutputDescriptor } from 'tsp-typescript-client/lib/models/output-descriptor';
import { TspClientResponse } from 'tsp-typescript-client/lib/protocol/tsp-client-response';
import { signalManager, Signals } from './signal-manager';

export class TraceManager {

    private fOpenTraces: Map<string, Trace> = new Map();
    private fTspClient: TspClient;

    constructor(
        tspClient: TspClient
    ) {
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
        if (tracesResponse.isOk()) {
            openedTraces.push(...tracesResponse.getModel());
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
        const traceResponse = await this.fTspClient.openTrace(new Query({
            'name': traceName,
            'uri': traceURI
        }));

        const openedTrace = traceResponse.getModel();
        if (openedTrace && traceResponse.isOk()) {
            this.addTrace(openedTrace);
            signalManager().emit(Signals.TRACE_OPENED, {trace: openedTrace});
            return openedTrace;
        } else if (openedTrace && traceResponse.getStatusCode() === 409) {
            // Repost with a suffix as long as there are conflicts
            const handleConflict = async function (tspClient: TspClient, tryNb: number): Promise<TspClientResponse<Trace>> {
                const suffix = '(' + tryNb + ')';
                return tspClient.openTrace(new Query({
                    'name': name + suffix,
                    'uri': traceURI
                }));
            };
            let conflictResolutionResponse = traceResponse;
            let i = 1;
            while (conflictResolutionResponse.getStatusCode() === 409) {
                conflictResolutionResponse = await handleConflict(this.fTspClient, i);
                i++;
            }
            const trace = conflictResolutionResponse.getModel();
            if (trace && conflictResolutionResponse.isOk()) {
                this.addTrace(trace);
                signalManager().emit(Signals.TRACE_OPENED, {trace: openedTrace});
                return trace;
            }
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
            if (trace && traceResponse.isOk) {
                this.fOpenTraces.set(traceUUID, trace);
                return trace;
            }
        }

        return undefined;
    }

    /**
     * Close the given on the server
     * @param traceUUID Trace UUID
     */
    async closeTrace(traceUUID: string): Promise<void> {
        const traceToClose = this.fOpenTraces.get(traceUUID);
        if (traceToClose) {
            await this.fTspClient.deleteTrace(traceUUID);
            const deletedTrace = this.removeTrace(traceUUID);
            if (deletedTrace) {
                signalManager().emit(Signals.TRACE_CLOSED, {trace: deletedTrace});
            }
        }
    }

    private addTrace(trace: Trace) {
        this.fOpenTraces.set(trace.UUID, trace);
    }

    private removeTrace(traceUUID: string): Trace | undefined {
        const deletedTrace = this.fOpenTraces.get(traceUUID);
        this.fOpenTraces.delete(traceUUID);
        return deletedTrace;
    }
}
