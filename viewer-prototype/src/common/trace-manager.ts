import { Trace } from 'tsp-typescript-client/lib/models/trace';
import { Path, Emitter } from '@theia/core';
import { TspClient } from 'tsp-typescript-client/lib/protocol/tsp-client';
import { Query } from 'tsp-typescript-client/lib/models/query/query';
import { injectable, inject } from 'inversify';
import { OutputDescriptor } from 'tsp-typescript-client/lib/models/output-descriptor';

@injectable()
export class TraceManager {
    // Open signal
    private traceOpenedEmitter = new Emitter<Trace>();
    public traceOpenedSignal = this.traceOpenedEmitter.event;

    // Close signal
    private traceClosedEmitter = new Emitter<Trace>();
    public traceClosedSignal = this.traceClosedEmitter.event;

    private fOpenTraces: Map<string, Trace> = new Map();;

    private constructor(
        @inject(TspClient) private tspClient: TspClient
    ) { }

    /**
     * Get an array of opened traces
     * @returns Array of Trace
     */
    async getOpenedTraces(): Promise<Trace[]> {
        const openedTraces: Array<Trace> = new Array();
        // Look on the server for opened trace
        const tracesResponse = await this.tspClient.fetchTraces();
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
            const traceResponse = await this.tspClient.fetchTrace(traceUUID);
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
            const outputsResponse = await this.tspClient.experimentOutputs(trace.UUID);
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
    async openTrace(traceURI: Path, traceName?: string): Promise<Trace | undefined> {
        let name = traceURI.name;
        if (traceName) {
            name = traceName;
        }

        const tracePath = traceURI.toString();
        const traceResponse = await this.tspClient.openTrace(new Query({
            'name': name,
            'uri': tracePath
        }));
        const trace = traceResponse.getModel()
        if (trace && (traceResponse.isOk() || traceResponse.getStatusCode() === 409)) {
            this.addTrace(trace);
            this.traceOpenedEmitter.fire(trace);
            return trace;
        }
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
            const traceResponse = await this.tspClient.fetchTrace(currentTrace.UUID);
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
    async closeTrace(traceUUID: string) {
        const traceToClose = this.fOpenTraces.get(traceUUID);
        if (traceToClose) {
            await this.tspClient.deleteTrace(traceUUID);
            const deletedTrace = this.removeTrace(traceUUID);
            if (deletedTrace) {
                this.traceClosedEmitter.fire(deletedTrace);
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
