import { TspClient } from 'tsp-typescript-client/lib/protocol/tsp-client';
import { ExperimentManager } from './experiment-manager';
import { TraceManager } from './trace-manager';

export interface ITspClientProvider {
    getTspClient(): TspClient;
    getTraceManager(): TraceManager;
    getExperimentManager(): ExperimentManager;
    /**
     * Add a listener for trace server url changes
     * @param listener The listener function to be called when the url is
     * changed
     */
    addTspClientChangeListener(listener: (tspClient: TspClient) => void): void;
}
