import { injectable, inject } from 'inversify';
import { EnvVariablesServer } from '@theia/core/lib/common/env-variables';
import { TRACE_SERVER_DEFAULT_URL, TRACE_SERVER_DEFAULT_PORT } from './trace-server-url-provider';
import { PreferenceService } from '@theia/core/lib/browser';
import { TRACE_PORT } from '../browser/trace-server-preference';

@injectable()
export class TraceViewerEnvironment {
    private port: string | undefined;

    constructor(
        @inject(EnvVariablesServer) protected readonly environments: EnvVariablesServer,
        @inject(PreferenceService) protected readonly preferenceService: PreferenceService) {

        this.port = this.preferenceService.get(TRACE_PORT);
        this.preferenceService.onPreferenceChanged(event => {
            if (event.preferenceName === TRACE_PORT) {
                this.port = event.newValue;
                this._traceServerUrl = TRACE_SERVER_DEFAULT_URL.replace(/{}/g, this.port ? this.port : TRACE_SERVER_DEFAULT_PORT);
            }
        });
    }

    protected _traceServerUrl: string | undefined;
    async getTraceServerUrl(): Promise<string> {
        if (!this._traceServerUrl) {
            const traceServerUrl = await this.environments.getValue('TRACE_SERVER_URL');
            this._traceServerUrl = traceServerUrl ? this.parseUrl(traceServerUrl.value || TRACE_SERVER_DEFAULT_URL) : TRACE_SERVER_DEFAULT_URL;
        }
        return this._traceServerUrl.replace(/{}/g, this.port ? this.port : TRACE_SERVER_DEFAULT_PORT);
    }

    private parseUrl(url: string): string {
        let lcUrl = url.toLowerCase();
        // Add the http
        if (!lcUrl.startsWith('http')) {
            lcUrl = 'http://' + lcUrl;
        }
        // Make sure it does not end with a slash
        if (lcUrl.endsWith('/')) {
            lcUrl = lcUrl.substring(0, lcUrl.length - 1);
        }
        return lcUrl;
    }

}
