import { inject, injectable } from '@theia/core/shared/inversify';
import { TraceServerConfigService } from '../common/trace-server-config';
import {
    TraceServerUrlProvider,
    TRACE_SERVER_DEFAULT_URL,
    TRACE_VIEWER_DEFAULT_PORT,
    PortPreferenceProxy
} from '../common/trace-server-url-provider';
import { Event, Emitter } from '@theia/core';
import { BackendApplicationContribution } from '@theia/core/lib/node';

@injectable()
export class TraceServerUrlProviderImpl
    implements TraceServerUrlProvider, BackendApplicationContribution, PortPreferenceProxy
{
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

    constructor(@inject(TraceServerConfigService) protected traceServerConfigService: TraceServerConfigService) {
        this._traceServerUrlPromise = new Promise(resolve => {
            const self = this.onDidChangeTraceServerUrl(url => {
                self.dispose();
                resolve(url);
            });
        });
        // Get the URL template from the remote environment.
        const variable = process.env['TRACE_SERVER_URL'];
        this._traceServerUrlTemplate = variable ? this.normalizeUrl(variable) : TRACE_SERVER_DEFAULT_URL;
        this._traceServerPort = TRACE_VIEWER_DEFAULT_PORT;
        this.updateTraceServerUrl();
    }

    async onPortPreferenceChanged(
        newPort: number | undefined,
        oldValue?: number,
        preferenceChanged = false
    ): Promise<void> {
        if (preferenceChanged || this._traceServerPort !== newPort) {
            this._traceServerPort = newPort;
            this.updateTraceServerUrl();
            try {
                await this.traceServerConfigService.stopTraceServer();
                if (oldValue) {
                    console.info(`Trace server disconnected on port: ${oldValue}.`);
                }
            } catch (_) {
                // Do not show the error incase the user tries to modify the port before starting a server
            }
        }
    }

    async initialize(): Promise<void> {
        // Don't conclude the initialization life-cycle phase of this contribution
        // until the Trace Server URL is initialized.
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
