import { inject, injectable } from 'inversify';
import { TraceServerUrlProvider, TRACE_SERVER_DEFAULT_URL } from '../common/trace-server-url-provider';
import { FrontendApplicationContribution } from '@theia/core/lib/browser';
import { TracePreferences, TRACE_PORT } from './trace-server-preference';
import { TraceServerConfigService } from '../common/trace-server-config';
import { Emitter, Event, MessageService } from '@theia/core';
import { EnvVariablesServer } from '@theia/core/lib/common/env-variables/env-variables-protocol';

@injectable()
export class TraceServerUrlProviderImpl implements TraceServerUrlProvider, FrontendApplicationContribution {

    /**
     * `undefined` until both `_traceServerUrlPromise` and `_traceServerPortPromise` are resolved.
     * Updated each time the port is changed from the preferences.
     */
    protected _traceServerUrl?: string;
    protected _onDidChangeTraceServerUrlEmitter = new Emitter<string>();

    /** `undefined` until `_traceServerUrlPromise` is resolved. */
    protected _traceServerUrlTemplate?: string;
    protected _traceServerUrlTemplatePromise: Promise<string>;

    /** `undefined` until `_traceServerPortPromise` is resolved. */
    protected _traceServerPort?: number;
    protected _traceServerPortPromise: Promise<number>;

    /** To prevent parallel execution of the `TRACE_PORT` preference change callback. */
    protected _traceServerPortEventId = 0;

    get onDidChangeTraceServerUrl(): Event<string> {
        return this._onDidChangeTraceServerUrlEmitter.event;
    }

    constructor(
        @inject(EnvVariablesServer) protected environment: EnvVariablesServer,
        @inject(TracePreferences) protected tracePreferences: TracePreferences,
        @inject(TraceServerConfigService) protected traceServerConfigService: TraceServerConfigService,
        @inject(MessageService) protected messageService: MessageService,
    ) {
        this._traceServerUrlTemplatePromise = this.environment.getValue('TRACE_SERVER_URL')
            .then(variable => {
                const url = variable?.value;
                return url // string(true) | empty-string(false) | undefined(false)
                    ? this.normalizeUrl(url)
                    : TRACE_SERVER_DEFAULT_URL;
            });
        this._traceServerPortPromise = this.tracePreferences.ready
            .then(() => {
                this.tracePreferences.onPreferenceChanged(async event => {
                    if (event.preferenceName === TRACE_PORT) {
                        const id = this._traceServerPortEventId++;
                        this._traceServerPort = event.newValue;
                        try {
                            await this.traceServerConfigService.stopTraceServer();
                            this.messageService.info(`Trace server disconnected on port: ${event.oldValue}.`);
                        } catch (e) {
                            // Do not show the error incase the user tries to modify the port before starting a server
                        }
                        // Skip this event as a new one is running concurrently.
                        if (this._traceServerPortEventId !== id) {
                            return;
                        }
                        // Make sure we only update and fire the url change event after being initialized.
                        if (this._traceServerUrl !== undefined) {
                            this.updateTraceServerUrl(true);
                        }
                    }
                });
                return this.tracePreferences[TRACE_PORT];
            });
    }

    async initialize(): Promise<void> {
        // Don't start the application until the traceServerUrl is set.
        [
            this._traceServerPort,
            this._traceServerUrlTemplate,
        ] = await Promise.all([
            this._traceServerPortPromise,
            this._traceServerUrlTemplatePromise,
        ]);
        // Do not fire the url change event on initialization, only set `_traceServerUrl`.
        this.updateTraceServerUrl(false);
    }

    getTraceServerUrl(): string {
        if (this._traceServerUrl === undefined) {
            throw new Error('the trace server url is not yet defined (too early?)');
        }
        return this._traceServerUrl;
    }

    protected normalizeUrl(url: string): string {
        url = url.toLowerCase();
        // Add the http
        if (!url.startsWith('http')) {
            url = 'http://' + url;
        }
        // Make sure it does not end with a slash
        if (url.endsWith('/')) {
            url = url.substring(0, url.length - 1);
        }
        return url;
    }

    protected updateTraceServerUrl(fireEvent: boolean): void {
        if (this._traceServerPort === undefined || this._traceServerUrlTemplate === undefined) {
            return;
        }
        this._traceServerUrl = this._traceServerUrlTemplate.replace(/{}/g, this._traceServerPort.toString());
        if (fireEvent) {
            this._onDidChangeTraceServerUrlEmitter.fire(this._traceServerUrl);
        }
    }
}
