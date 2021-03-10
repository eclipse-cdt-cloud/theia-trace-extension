import { inject, injectable } from 'inversify';
import { TraceViewerEnvironment } from '../common/trace-viewer-environment';
import { TraceServerUrlProvider, TRACE_SERVER_DEFAULT_URL, TRACE_SERVER_DEFAULT_PORT } from '../common/trace-server-url-provider';
import { FrontendApplicationContribution, FrontendApplication, PreferenceService } from '@theia/core/lib/browser';
import { TRACE_PORT } from './trace-server-preference';
import { TraceServerConfigService } from '../common/trace-server-config';
import { MessageService } from '@theia/core';

@injectable()
export class TraceServerUrlProviderImpl implements TraceServerUrlProvider, FrontendApplicationContribution {

    protected _traceServerUrl: string;
    protected _listeners: ((url: string) => void)[];
    private port: string | undefined;

    constructor(
        @inject(TraceViewerEnvironment) protected readonly traceViewerEnvironment: TraceViewerEnvironment,
        @inject(PreferenceService) protected readonly preferenceService: PreferenceService,
        @inject(TraceServerConfigService) protected readonly traceServerConfigService: TraceServerConfigService,
        @inject(MessageService) protected readonly messageService: MessageService

    ) {
        this.port = this.preferenceService.get(TRACE_PORT);
        this.preferenceService.onPreferenceChanged(async event => {
            if (event.preferenceName === TRACE_PORT) {
                try {
                    await this.traceServerConfigService.stopTraceServer();
                    this.messageService.info(`Trace server disconnected on port: ${this.port}.`);
                } catch (e){
                    // Do not show the error incase the user tries to modify the port before starting a server
                }
                this.port = event.newValue;
                this._traceServerUrl = TRACE_SERVER_DEFAULT_URL.replace(/{}/g, this.port ? this.port : TRACE_SERVER_DEFAULT_PORT);
                this.updateListeners();

            }

        });

        this._traceServerUrl = TRACE_SERVER_DEFAULT_URL.replace(/{}/g, this.port ? this.port : TRACE_SERVER_DEFAULT_PORT);
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
