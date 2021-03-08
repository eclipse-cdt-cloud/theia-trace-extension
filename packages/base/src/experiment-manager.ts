import { Trace } from 'tsp-typescript-client/lib/models/trace';
import { TspClient } from 'tsp-typescript-client/lib/protocol/tsp-client';
import { Query } from 'tsp-typescript-client/lib/models/query/query';
import { OutputDescriptor } from 'tsp-typescript-client/lib/models/output-descriptor';
import { Experiment } from 'tsp-typescript-client/lib/models/experiment';
import { TraceManager } from './trace-manager';
import { TspClientResponse } from 'tsp-typescript-client/lib/protocol/tsp-client-response';
import { signalManager, Signals } from './signals/signal-manager';

export class ExperimentManager {

    private fOpenExperiments: Map<string, Experiment> = new Map();
    private fTspClient: TspClient;
    private fTraceManager: TraceManager;

    constructor(
        tspClient: TspClient,
        traceManager: TraceManager
    ) {
        this.fTspClient = tspClient;
        this.fTraceManager = traceManager;
        signalManager().on(Signals.EXPERIMENT_CLOSED, (experiment: Experiment) => this.onExperimentClosed(experiment));
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
        if (outputsResponse && outputsResponse.getStatusCode() === 200) {
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

        const tryCreate = async function (tspClient: TspClient, retry: number): Promise<TspClientResponse<Experiment>> {
            return tspClient.createExperiment(new Query({
                'name': retry === 0 ? name : name + '(' + retry + ')',
                'traces': traceURIs
            }));
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
            signalManager().fireExperimentOpenedSignal(experiment);
            return experiment;
        }
        // TODO Handle any other experiment open errors
        return undefined;
    }

    /**
     * Update the experiment with the latest info from the server.
     * @param experimentName experiment name to update
     * @returns The updated experiment or undefined if the experiment was not open previously
     */
    async updateExperiment(experimentUUID: string): Promise<Experiment | undefined> {
        const currentExperiment = this.fOpenExperiments.get(experimentUUID);
        if (currentExperiment) {
            const experimentResponse = await this.fTspClient.fetchExperiment(currentExperiment.UUID);
            const experiment = experimentResponse.getModel();
            if (experiment && experimentResponse.isOk) {
                this.fOpenExperiments.set(experimentUUID, experiment);
                return experiment;
            }
        }

        return undefined;
    }

    /**
     * Close the given on the server
     * @param experimentUUID experiment UUID
     */
    async closeExperiment(experimentUUID: string): Promise<void> {
        const experimentToClose = this.fOpenExperiments.get(experimentUUID);
        if (experimentToClose) {
            await this.fTspClient.deleteExperiment(experimentUUID);
            const deletedExperiment = this.removeExperiment(experimentUUID);
            if (deletedExperiment) {
                signalManager().fireExperimentClosedSignal(deletedExperiment);
            }
        }
    }

    private onExperimentClosed(experiment: Experiment) {
        /*
         * TODO: Do not close traces used by another experiment
         */
        // Close each trace
        const traces = experiment.traces;
        for (let i = 0; i < traces.length; i++) {
            this.fTraceManager.closeTrace(traces[i].UUID);
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
