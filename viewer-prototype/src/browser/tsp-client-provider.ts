import { injectable, inject } from 'inversify';
import { TraceServerUrlProvider } from '../common/trace-server-url-provider';
import { TspClient } from 'tsp-typescript-client/lib/protocol/tsp-client';

@injectable()
export class TspClientProvider {

    private _tspClient: TspClient;
    private _listeners: ((tspClient: TspClient) => void)[];

    constructor(
        @inject(TraceServerUrlProvider) private tspUrlProvider: TraceServerUrlProvider
    ) {
        this._tspClient = new TspClient(this.tspUrlProvider.getTraceServerUrl());
        this._listeners = [];
        tspUrlProvider.addTraceServerUrlChangedListener(url => {
            this._tspClient = new TspClient(url);
            this._listeners.forEach(listener => listener(this._tspClient));
        });
    }

    public getTspClient(): TspClient {
        return this._tspClient;
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
