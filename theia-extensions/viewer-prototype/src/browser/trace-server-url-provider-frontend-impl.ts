import { Emitter, Event, MessageService } from '@theia/core';
import { FrontendApplicationContribution } from '@theia/core/lib/browser';
import { EnvVariablesServer } from '@theia/core/lib/common/env-variables/env-variables-protocol';
import { inject, injectable } from 'inversify';
import { TraceServerConfigService } from '../common/trace-server-config';
import { TraceServerUrlProvider, TRACE_SERVER_DEFAULT_URL } from '../common/trace-server-url-provider';
import { TracePreferences, TRACE_PORT } from './trace-server-preference';

@injectable()
export class TraceServerUrlProviderImpl implements TraceServerUrlProvider, FrontendApplicationContribution {

    /**
     * The Trace Server URL resolved from a URL template and a port number.
     * Updated each time the port is changed from the preferences.
     * `undefined` until both `_traceServerUrlPromise` and `_traceServerPortPromise` are resolved.
     */
    protected _traceServerUrl?: string;

    /**
     * The Trace Server URL template.
     * The `{}` characters will be replaced with the port defined in the preferences.
     * `undefined` until `_traceServerUrlPromise` is resolved.
     */
    protected _traceServerUrlTemplate?: string;

    /**
     * A configurable port number from the preferences.
     * `undefined` until `_traceServerPortPromise` is resolved.
     */
    protected _traceServerPort?: number;

    /**
     * Identifier for port preference change event handlers.
     * Used to prevent some concurrency cases.
     */
    protected _traceServerPortEventId = 0;

    protected _traceServerUrlPromise: Promise<string>;

    protected _onDidChangeTraceServerUrlEmitter = new Emitter<string>();

    /**
     * Listen for updates to the Trace Server URL.
     * This happens when a user changes the `TRACE_PORT` user preference.
     */
    get onDidChangeTraceServerUrl(): Event<string> {
        return this._onDidChangeTraceServerUrlEmitter.event;
    }

    constructor(
        @inject(EnvVariablesServer) protected environment: EnvVariablesServer,
        @inject(TracePreferences) protected tracePreferences: TracePreferences,
        @inject(TraceServerConfigService) protected traceServerConfigService: TraceServerConfigService,
        @inject(MessageService) protected messageService: MessageService,
    ) {
        this._traceServerUrlPromise = new Promise(resolve => {
            const self = this.onDidChangeTraceServerUrl(url => {
                self.dispose();
                resolve(url);
            });
        });
        // Get the URL template from the remote environment.
        this.environment.getValue('TRACE_SERVER_URL')
            .then(variable => {
                const url = variable?.value;
                this._traceServerUrlTemplate = url
                    ? this.normalizeUrl(url)
                    : TRACE_SERVER_DEFAULT_URL;
                this.updateTraceServerUrl();
            });
        // Get the configurable port from Theia's preferences.
        this.tracePreferences.ready
            .then(() => {
                this._traceServerPort = this.tracePreferences[TRACE_PORT];
                this.tracePreferences.onPreferenceChanged(async event => {
                    if (event.preferenceName === TRACE_PORT) {
                        const id = this._traceServerPortEventId++;
                        this._traceServerPort = event.newValue;
                        try {
                            await this.traceServerConfigService.stopTraceServer();
                            this.messageService.info(`Trace server disconnected on port: ${event.oldValue}.`);
                        } catch (_) {
                            // Do not show the error incase the user tries to modify the port before starting a server
                        }
                        // Skip this event as a new one is running concurrently.
                        if (this._traceServerPortEventId !== id) {
                            return;
                        }
                        this.updateTraceServerUrl();
                    }
                });
                this.updateTraceServerUrl();
            });
    }

    async initialize(): Promise<void> {
        // Don't start the application until the Trace Server URL is initialized.
        await this._traceServerUrlPromise;
    }

    /**
     * Promise that resolves once the Trace Server URL is fully initialized.
     */
    async getTraceServerUrlPromise(): Promise<string> {
        return this._traceServerUrlPromise;
    }

    /**
     * Get the configured and initialized Trace Server URL.
     * If this method is called in `injectable` class construtors it will throw,
     * fetching the Trace Server URL is inherently asynchronous.
     */
    getTraceServerUrl(): string {
        if (this._traceServerUrl === undefined) {
            throw new Error('The trace server url is not yet defined. Try using getTraceServerUrlPromise.');
        }
        return this._traceServerUrl;
    }

    protected normalizeUrl(url: string): string {
        url = url.toLowerCase();
        // Add missing http protocol.
        if (!url.endsWith('http://') || !url.endsWith('https://')) {
            url = 'http://' + url;
        }
        // Remove trailing `/`.
        if (url.endsWith('/')) {
            url = url.substring(0, url.length - 1);
        }
        return url;
    }

    protected setTraceServerUrl(urlTemplate: string, port: number): string {
        const traceServerUrl = urlTemplate.replace(/{}/g, port.toString());
        this._traceServerUrl = traceServerUrl;
        this._traceServerUrlPromise = Promise.resolve(traceServerUrl);
        this._onDidChangeTraceServerUrlEmitter.fire(traceServerUrl);
        return traceServerUrl;
    }

    protected updateTraceServerUrl(): string | undefined {
        if (this._traceServerPort === undefined || this._traceServerUrlTemplate === undefined) {
            return; // State is only partially initialized = try again later.
        }
        return this.setTraceServerUrl(this._traceServerUrlTemplate, this._traceServerPort);
    }
}
