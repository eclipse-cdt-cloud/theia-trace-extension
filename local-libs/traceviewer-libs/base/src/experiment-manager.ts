import { Trace } from 'tsp-typescript-client/lib/models/trace';
import { ITspClient } from 'tsp-typescript-client/lib/protocol/tsp-client';
import { Query } from 'tsp-typescript-client/lib/models/query/query';
import { OutputDescriptor } from 'tsp-typescript-client/lib/models/output-descriptor';
import { Experiment } from 'tsp-typescript-client/lib/models/experiment';
import { TraceManager } from './trace-manager';
import { TspClientResponse } from 'tsp-typescript-client/lib/protocol/tsp-client-response';
import { signalManager } from './signals/signal-manager';

export class ExperimentManager {
    private fOpenExperiments: Map<string, Experiment> = new Map();
    private fTspClient: ITspClient;
    private fTraceManager: TraceManager;

    constructor(tspClient: ITspClient, traceManager: TraceManager) {
        this.fTspClient = tspClient;
        this.fTraceManager = traceManager;
        signalManager().on('EXPERIMENT_DELETED', (experiment: Experiment) => this.onExperimentDeleted(experiment));
    }

    /**
     * Get an array of opened experiments
     * @returns Array of experiment
     */
    async getOpenedExperiments(): Promise<Experiment[]> {
        const openedExperiments: Array<Experiment> = [];
        // Look on the server for opened experiments
        const experimentsResponse = await this.fTspClient.fetchExperiments();
        const experiments = experimentsResponse.getModel();
        if (experimentsResponse.isOk() && experiments) {
            openedExperiments.push(...experiments);
        }
        return openedExperiments;
    }

    /**
     * Get a specific experiment information
     * @param experimentUUID experiment UUID
     */
    async getExperiment(experimentUUID: string): Promise<Experiment | undefined> {
        // Check if the experiment is in "cache"
        let experiment = this.fOpenExperiments.get(experimentUUID);

        // If the experiment is undefined, check on the server
        if (!experiment) {
            const experimentResponse = await this.fTspClient.fetchExperiment(experimentUUID);
            if (experimentResponse.isOk()) {
                experiment = experimentResponse.getModel();
            }
        }
        return experiment;
    }

    /**
     * Get an array of OutputDescriptor for a given experiment
     * @param experimentUUID experiment UUID
     */
    async getAvailableOutputs(experimentUUID: string): Promise<OutputDescriptor[] | undefined> {
        const outputsResponse = await this.fTspClient.experimentOutputs(experimentUUID);
        if (outputsResponse && outputsResponse.isOk()) {
            return outputsResponse.getModel();
        }
        return undefined;
    }

    /**
     * Open a given experiment on the server
     * @param experimentURI experiment URI to open
     * @param experimentName Optional name for the experiment. If not specified the URI name is used
     * @returns The opened experiment
     */
    async openExperiment(experimentName: string, traces: Array<Trace>): Promise<Experiment | undefined> {
        const name = experimentName;

        const traceURIs = new Array<string>();
        for (let i = 0; i < traces.length; i++) {
            traceURIs.push(traces[i].UUID);
        }

        const tryCreate = async function (
            tspClient: ITspClient,
            retry: number
        ): Promise<TspClientResponse<Experiment>> {
            return tspClient.createExperiment(
                new Query({
                    name: retry === 0 ? name : name + '(' + retry + ')',
                    traces: traceURIs
                })
            );
        };
        let tryNb = 0;
        let experimentResponse: TspClientResponse<Experiment> | undefined;
        while (experimentResponse === undefined || experimentResponse.getStatusCode() === 409) {
            experimentResponse = await tryCreate(this.fTspClient, tryNb);
            tryNb++;
        }
        const experiment = experimentResponse.getModel();
        if (experimentResponse.isOk() && experiment) {
            this.addExperiment(experiment);
            signalManager().emit('EXPERIMENT_OPENED', experiment);
            return experiment;
        }
        // TODO Handle any other experiment open errors
        return undefined;
    }

    /**
     * Update the experiment with the latest info from the server.
     * @param experimentUUID experiment UUID
     * @returns The updated experiment or undefined if the experiment failed to update
     */
    async updateExperiment(experimentUUID: string): Promise<Experiment | undefined> {
        const experimentResponse = await this.fTspClient.fetchExperiment(experimentUUID);
        const experiment = experimentResponse.getModel();
        if (experiment && experimentResponse.isOk()) {
            this.fOpenExperiments.set(experimentUUID, experiment);
            return experiment;
        }
        return undefined;
    }

    /**
     * Delete the given experiment from the server
     * @param experimentUUID experiment UUID
     */
    async deleteExperiment(experimentUUID: string): Promise<void> {
        const experimentToDelete = this.fOpenExperiments.get(experimentUUID);
        if (experimentToDelete) {
            await this.fTspClient.deleteExperiment(experimentUUID);
            const deletedExperiment = this.removeExperiment(experimentUUID);
            if (deletedExperiment) {
                signalManager().emit('EXPERIMENT_DELETED', deletedExperiment);
            }
        }
    }

    private onExperimentDeleted(experiment: Experiment) {
        /*
         * TODO: Do not close traces used by another experiment
         */
        // Close each trace
        const traces = experiment.traces;
        for (let i = 0; i < traces.length; i++) {
            this.fTraceManager.deleteTrace(traces[i].UUID);
        }
    }

    public addExperiment(experiment: Experiment): void {
        this.fOpenExperiments.set(experiment.UUID, experiment);
        experiment.traces.forEach(trace => {
            this.fTraceManager.addTrace(trace);
        });
    }

    private removeExperiment(experimentUUID: string): Experiment | undefined {
        const deletedExperiment = this.fOpenExperiments.get(experimentUUID);
        this.fOpenExperiments.delete(experimentUUID);
        return deletedExperiment;
    }
}
