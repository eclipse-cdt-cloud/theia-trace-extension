import { inject, injectable } from 'inversify';
import { TraceViewerEnvironment } from '../common/trace-viewer-environment';
import { TraceServerUrlProvider, TRACE_SERVER_DEFAULT_URL } from '../common/trace-server-url-provider';
import { FrontendApplicationContribution, FrontendApplication } from '@theia/core/lib/browser';

@injectable()
export class TraceServerUrlProviderImpl implements TraceServerUrlProvider, FrontendApplicationContribution {

    protected _traceServerUrl: string;
    protected _listeners: ((url: string) => void)[];

    constructor(
        @inject(TraceViewerEnvironment) protected readonly traceViewerEnvironment: TraceViewerEnvironment
    ) {
        this._traceServerUrl = TRACE_SERVER_DEFAULT_URL;
        this._listeners = [];
    }

    async onStart(_app: FrontendApplication): Promise<void> {
        this._traceServerUrl = await this.traceViewerEnvironment.getTraceServerUrl();
        this.updateListeners();
    }

    async updateListeners(): Promise<void> {
        this._listeners.forEach(listener => listener(this._traceServerUrl));
    }

    getTraceServerUrl(): string {
        return this._traceServerUrl;
    }

    /**
     * Add a listener for trace server url changes
     * @param listener The listener function to be called when the url is
     * changed
     */
    addTraceServerUrlChangedListener(listener: (url: string) => void): void {
        this._listeners.push(listener);
    }

}
