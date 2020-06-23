import { Trace } from 'tsp-typescript-client/lib/models/trace';
import { Emitter } from '@theia/core';
import { TspClient } from 'tsp-typescript-client/lib/protocol/tsp-client';
import { Query } from 'tsp-typescript-client/lib/models/query/query';
import { injectable, inject } from 'inversify';
import { OutputDescriptor } from 'tsp-typescript-client/lib/models/output-descriptor';
import { Experiment } from 'tsp-typescript-client/lib/models/experiment';
import { TspClientResponse } from 'tsp-typescript-client/lib/protocol/tsp-client-response';

@injectable()
export class ExperimentManager {
    // Open signal
    private experimentOpenedEmitter = new Emitter<Experiment>();
    public experimentOpenedSignal = this.experimentOpenedEmitter.event;

    // Close signal
    private experimentClosedEmitter = new Emitter<Experiment>();
    public experimentClosedSignal = this.experimentClosedEmitter.event;

    private fOpenExperiments: Map<string, Experiment> = new Map();

    private constructor(
        @inject(TspClient) private tspClient: TspClient
    ) { }

    /**
     * Get an array of opened experiments
     * @returns Array of experiment
     */
    async getOpenedExperiments(): Promise<Experiment[]> {
        const openedExperiments: Array<Experiment> = [];
        // Look on the server for opened experiments
        const experimentResponse = await this.tspClient.fetchExperiments();
        if (experimentResponse.isOk()) {
            openedExperiments.push(...experimentResponse.getModel());
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
            const experimentResponse = await this.tspClient.fetchExperiment(experimentUUID);
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
        // Check if the experiment is opened
        const experiment = this.fOpenExperiments.get(experimentUUID);
        if (experiment) {
            const outputsResponse = await this.tspClient.experimentOutputs(experiment.UUID);
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

        const experimentResponse = await this.tspClient.createExperiment(new Query({
            'name': name,
            'traces': traceURIs
        }));
        const opendExperiment = experimentResponse.getModel();
        if (opendExperiment && experimentResponse.isOk()) {
            this.addExperiment(opendExperiment);
            this.experimentOpenedEmitter.fire(opendExperiment);
            return opendExperiment;
        } else if (opendExperiment && experimentResponse.getStatusCode() === 409) {
            // Repost with a suffix as long as there are conflicts
            const handleConflict = async function (tspClient: TspClient, tryNb: number): Promise<TspClientResponse<Experiment>> {
                const suffix = '(' + tryNb + ')';
                return await tspClient.createExperiment(new Query({
                    'name': name + suffix,
                    'traces': traceURIs
                }));
            };
            let conflictResolutionResponse = experimentResponse;
            let i = 1;
            while (conflictResolutionResponse.getStatusCode() === 409) {
                conflictResolutionResponse = await handleConflict(this.tspClient, i);
                i++;
            }
            const experiment = conflictResolutionResponse.getModel();
            if (experiment && conflictResolutionResponse.isOk()) {
                this.addExperiment(experiment);
                this.experimentOpenedEmitter.fire(experiment);
                return experiment;
            }
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
            const experimentResponse = await this.tspClient.fetchExperiment(currentExperiment.UUID);
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
    async closeExperiment(experimentUUID: string) {
        const experimentToClose = this.fOpenExperiments.get(experimentUUID);
        if (experimentToClose) {
            await this.tspClient.deleteExperiment(experimentUUID);
            const deletedExperiment = this.removeExperiment(experimentUUID);
            if (deletedExperiment) {
                this.experimentClosedEmitter.fire(deletedExperiment);
            }
        }
    }

    private addExperiment(experiment: Experiment) {
        this.fOpenExperiments.set(experiment.UUID, experiment);
    }

    private removeExperiment(experimentUUID: string): Experiment | undefined {
        const deletedExperiment = this.fOpenExperiments.get(experimentUUID);
        this.fOpenExperiments.delete(experimentUUID);
        return deletedExperiment;
    }
}
