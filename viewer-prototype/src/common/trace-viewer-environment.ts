import { injectable, inject } from 'inversify';
import { EnvVariablesServer } from '@theia/core/lib/common/env-variables';
import { TRACE_SERVER_DEFAULT_URL } from './trace-server-url-provider';

@injectable()
export class TraceViewerEnvironment {

    constructor(
        @inject(EnvVariablesServer) protected readonly environments: EnvVariablesServer) {

    }

    protected _traceServerUrl: string | undefined;
    async getTraceServerUrl(): Promise<string> {
        if (!this._traceServerUrl) {
            const traceServerUrl = await this.environments.getValue('TRACE_SERVER_URL');
            this._traceServerUrl = traceServerUrl ? this.parseUrl(traceServerUrl.value || TRACE_SERVER_DEFAULT_URL) : TRACE_SERVER_DEFAULT_URL;
        }
        return this._traceServerUrl;
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
