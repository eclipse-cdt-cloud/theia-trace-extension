import { ITspClient } from 'tsp-typescript-client/lib/protocol/tsp-client';
import { ExperimentManager } from './experiment-manager';
import { TraceManager } from './trace-manager';

export interface ITspClientProvider {
    getTspClient(): ITspClient;
    getTraceManager(): TraceManager;
    getExperimentManager(): ExperimentManager;
    /**
     * Add a listener for trace server url changes
     * @param listener The listener function to be called when the url is
     * changed
     */
    addTspClientChangeListener(listener: (tspClient: ITspClient) => void): void;
}
