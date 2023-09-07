import { Emitter, Event, MessageService } from '@theia/core';
import { FrontendApplicationContribution } from '@theia/core/lib/browser';
import { EnvVariablesServer } from '@theia/core/lib/common/env-variables/env-variables-protocol';
import { inject, injectable } from '@theia/core/shared/inversify';
import { TraceServerConfigService } from '../common/trace-server-config';
import { TraceServerUrlProvider, TRACE_SERVER_DEFAULT_URL } from '../common/trace-server-url-provider';
import { TracePreferences, TRACE_PORT } from './trace-server-preference';

@injectable()
export class TraceServerUrlProviderImpl implements TraceServerUrlProvider, FrontendApplicationContribution {
    /**
     * The Trace Server URL resolved from a URL template and a port number.
     * Updated each time the port is changed from the preferences.
     * `undefined` until both `_traceServerUrlTemplate` and `_traceServerPort` are initialized.
     */
    protected _traceServerUrl?: string;

    /**
     * The Trace Server URL template.
     * The `{}` characters will be replaced with the port defined in the preferences.
     * `undefined` until fetched from the remote environment.
     */
    protected _traceServerUrlTemplate?: string;

    /**
     * A configurable port number from the preferences.
     * `undefined` until fetched from the preferences.
     */
    protected _traceServerPort?: number;

    /**
     * Internal promise that is pending until `_traceServerUrl` is initialized.
     * After then, each update of the Trace Server URL will create a new reference
     * to a promise resolved with the new value.
     */
    protected _traceServerUrlPromise: Promise<string>;

    protected _onDidChangeTraceServerUrlEmitter = new Emitter<string>();

    /**
     * Listen for updates to the Trace Server URL.
     * Fired when Trace Server URL is first initiliazed and when the `TRACE_PORT` preference changes.
     */
    get onDidChangeTraceServerUrl(): Event<string> {
        return this._onDidChangeTraceServerUrlEmitter.event;
    }

    constructor(
        @inject(EnvVariablesServer) protected environment: EnvVariablesServer,
        @inject(TracePreferences) protected tracePreferences: TracePreferences,
        @inject(TraceServerConfigService) protected traceServerConfigService: TraceServerConfigService,
        @inject(MessageService) protected messageService: MessageService
    ) {
        this._traceServerUrlPromise = new Promise(resolve => {
            const self = this.onDidChangeTraceServerUrl(url => {
                self.dispose();
                resolve(url);
            });
        });
        // Get the URL template from the remote environment.
        this.environment.getValue('TRACE_SERVER_URL').then(variable => {
            const url = variable?.value;
            this._traceServerUrlTemplate = url ? this.normalizeUrl(url) : TRACE_SERVER_DEFAULT_URL;
            this.updateTraceServerUrl();
        });
        // Get the configurable port from Theia's preferences.
        this.tracePreferences.ready.then(() => {
            this._traceServerPort = this.tracePreferences[TRACE_PORT];
            this.updateTraceServerUrl();
            this.tracePreferences.onPreferenceChanged(async event => {
                if (event.preferenceName === TRACE_PORT) {
                    this._traceServerPort = event.newValue;
                    this.updateTraceServerUrl();
                    try {
                        await this.traceServerConfigService.stopTraceServer();
                        this.messageService.info(`Trace server disconnected on port: ${event.oldValue}.`);
                    } catch (_) {
                        // Do not show the error incase the user tries to modify the port before starting a server
                    }
                }
            });
        });
    }

    async initialize(): Promise<void> {
        // Don't start the application until the Trace Server URL is initialized.
        await this._traceServerUrlPromise;
    }

    async getTraceServerUrlPromise(): Promise<string> {
        return this._traceServerUrlPromise;
    }

    getTraceServerUrl(): string {
        if (this._traceServerUrl === undefined) {
            throw new Error('The Trace Server URL is not yet defined. Try using getTraceServerUrlPromise.');
        }
        return this._traceServerUrl;
    }

    protected normalizeUrl(url: string): string {
        url = url.toLowerCase();
        // Add missing http protocol.
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = 'http://' + url;
        }
        // Remove trailing `/`.
        if (url.endsWith('/')) {
            url = url.substring(0, url.length - 1);
        }
        return url;
    }

    protected updateTraceServerUrl(): void {
        if (this._traceServerUrlTemplate === undefined || this._traceServerPort === undefined) {
            return; // State is only partially initialized = try again later.
        }
        const traceServerUrl = this._traceServerUrlTemplate.replace(/{}/g, this._traceServerPort.toString());
        this._traceServerUrl = traceServerUrl;
        this._traceServerUrlPromise = Promise.resolve(traceServerUrl);
        this._onDidChangeTraceServerUrlEmitter.fire(traceServerUrl);
    }
}
