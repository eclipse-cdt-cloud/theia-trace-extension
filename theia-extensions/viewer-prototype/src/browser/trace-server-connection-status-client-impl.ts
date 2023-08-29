/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { injectable } from 'inversify';
import {
    TraceServerConnectionStatusBackend,
    TraceServerConnectionStatusClient
} from '../common/trace-server-connection-status';
import { inject } from '@theia/core/shared/inversify';

@injectable()
export class TraceServerConnectionStatusClientImpl implements TraceServerConnectionStatusClient {
    constructor(
        @inject(TraceServerConnectionStatusBackend)
        protected traceServerConnectionStatusProxy: TraceServerConnectionStatusBackend
    ) {}

    updateStatus(status: boolean): void {
        TraceServerConnectionStatusClientImpl.renderStatus(status);
    }

    public addConnectionStatusListener(): void {
        this.traceServerConnectionStatusProxy.setClient(this);
    }

    public removeConnectionStatusListener(): void {
        this.traceServerConnectionStatusProxy.removeClient(this);
    }

    static renderStatus(status: boolean): void {
        if (document.getElementById('server-status-id')) {
            document.getElementById('server-status-id')!.className = status
                ? 'fa fa-check-circle-o fa-lg'
                : 'fa fa-times-circle-o fa-lg';
            document.getElementById('server-status-id')!.title = status
                ? 'Server health and latency are good. No known issues'
                : 'Trace Viewer Critical Error: Trace Server Offline';
            document.getElementById('server-status-id')!.style.color = status ? 'green' : 'red';
        }
    }
}
