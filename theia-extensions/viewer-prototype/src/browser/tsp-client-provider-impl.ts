import { injectable, inject } from '@theia/core/shared/inversify';
import { ExperimentManager } from 'traceviewer-base/lib/experiment-manager';
import { TraceManager } from 'traceviewer-base/lib/trace-manager';
import { ITspClientProvider } from 'traceviewer-base/lib/tsp-client-provider';
import { ITspClient } from 'tsp-typescript-client';
import { TheiaRpcTspProxy } from './theia-rpc-tsp-proxy';

@injectable()
export class TspClientProvider implements ITspClientProvider {
    private _tspClient: ITspClient;
    private _traceManager: TraceManager;
    private _experimentManager: ExperimentManager;
    private _listeners: ((tspClient: ITspClient) => void)[];

    constructor(@inject(TheiaRpcTspProxy) protected client: ITspClient) {
        this._tspClient = client;
        this._traceManager = new TraceManager(this._tspClient);
        this._experimentManager = new ExperimentManager(this._tspClient, this._traceManager);
        this._listeners = [];
    }

    public getTspClient(): ITspClient {
        return this._tspClient;
    }

    public getTraceManager(): TraceManager {
        return this._traceManager;
    }

    public getExperimentManager(): ExperimentManager {
        return this._experimentManager;
    }

    /**
     * Add a listener for trace server url changes
     * @param listener The listener function to be called when the url is
     * changed
     */
    addTspClientChangeListener(listener: (tspClient: ITspClient) => void): void {
        this._listeners.push(listener);
    }
}
