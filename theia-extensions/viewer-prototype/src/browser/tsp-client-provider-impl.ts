import { injectable, inject } from 'inversify';
import { TraceServerUrlProvider } from '../common/trace-server-url-provider';
import { TspClient } from 'tsp-typescript-client/lib/protocol/tsp-client';
import { ExperimentManager } from 'traceviewer-base/lib/experiment-manager';
import { TraceManager } from 'traceviewer-base/lib/trace-manager';
import { ITspClientProvider } from 'traceviewer-base/lib/tsp-client-provider';
import { LazyTspClientFactory } from 'traceviewer-base/lib/lazy-tsp-client';

@injectable()
export class TspClientProvider implements ITspClientProvider {

    private _tspClient: TspClient;
    private _traceManager: TraceManager;
    private _experimentManager: ExperimentManager;
    private _listeners: ((tspClient: TspClient) => void)[];

    constructor(
        @inject(TraceServerUrlProvider) private tspUrlProvider: TraceServerUrlProvider,
        @inject(LazyTspClientFactory) private lazyTspClientFactory: LazyTspClientFactory,
    ) {
        const traceServerUrlPromise = this.tspUrlProvider.getTraceServerUrlPromise();
        this._tspClient = this.lazyTspClientFactory(traceServerUrlPromise) as TspClient;
        this._traceManager = new TraceManager(this._tspClient);
        this._experimentManager = new ExperimentManager(this._tspClient, this._traceManager);
        this._listeners = [];
        // Skip the first event fired when the Trace Server URL gets initialized.
        traceServerUrlPromise.then(() => {
            tspUrlProvider.onDidChangeTraceServerUrl(url => {
                this._tspClient = new TspClient(url);
                this._traceManager = new TraceManager(this._tspClient);
                this._experimentManager = new ExperimentManager(this._tspClient, this._traceManager);
                for (const listener of this._listeners) {
                    listener(this._tspClient);
                }
            });
        });
    }

    public getTspClient(): TspClient {
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
    addTspClientChangeListener(listener: (tspClient: TspClient) => void): void {
        this._listeners.push(listener);
    }
}
