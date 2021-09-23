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
    protected _traceServerUrlPromise: Promise<string>;
    protected _onDidChangeTraceServerUrlEmitter = new Emitter<string>();

    /**
     * The Trace Server URL template.
     * The `{}` characters will be replaced with the port defined in the preferences.
     * `undefined` until `_traceServerUrlPromise` is resolved.
     */
    protected _traceServerUrlTemplate?: string;
    protected _traceServerUrlTemplatePromise: Promise<string>;

    /**
     * A configurable port number from the preferences.
     * `undefined` until `_traceServerPortPromise` is resolved.
     */
    protected _traceServerPort?: number;
    protected _traceServerPortPromise: Promise<number>;

    /**
     * Identifier for port preference change event handlers.
     * Used to prevent some concurrency cases.
     */
    protected _traceServerPortEventId = 0;

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
        // Get the URL template from the remote environment.
        this._traceServerUrlTemplatePromise = this.environment.getValue('TRACE_SERVER_URL')
            .then(variable => {
                const url = variable?.value;
                return url // string(true) | empty-string(false) | undefined(false)
                    ? this.normalizeUrl(url)
                    : TRACE_SERVER_DEFAULT_URL;
            });
        // Get the configurable port from Theia's preferences.
        this._traceServerPortPromise = this.tracePreferences.ready
            .then(() => {
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
                        // Make sure we only update and fire the url change event after being initialized.
                        if (this._traceServerUrl !== undefined) {
                            this.updateTraceServerUrl();
                        }
                    }
                });
                return this.tracePreferences[TRACE_PORT];
            });
        // Combine both the URL template and the port to initialize the Trace Server URL.
        this._traceServerUrlPromise = Promise.all([
            this._traceServerUrlTemplatePromise,
            this._traceServerPortPromise,
        ]).then(([
            urlTemplate,
            port
        ]) => this.setTraceServerUrl(urlTemplate, port));
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

    protected setTraceServerUrl(urlTemplate: string, port: number): string {
        const traceServerUrl = urlTemplate.replace(/{}/g, port.toString());
        this._traceServerUrl = traceServerUrl;
        this._onDidChangeTraceServerUrlEmitter.fire(traceServerUrl);
        return traceServerUrl;
    }

    protected updateTraceServerUrl(): void {
        if (this._traceServerPort === undefined || this._traceServerUrlTemplate === undefined) {
            return;
        }
        this.setTraceServerUrl(this._traceServerUrlTemplate, this._traceServerPort);
    }
}
