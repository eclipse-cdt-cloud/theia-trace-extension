/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { injectable } from 'inversify';
import { TraceServerConnectionStatusClient } from '../common/trace-server-connection-status';

@injectable()
export class TraceServerConnectionStatusClientImpl implements TraceServerConnectionStatusClient {
    protected active = false;

    updateStatus(status: boolean): void {
        if (this.active) {
            TraceServerConnectionStatusClientImpl.renderStatus(status);
        }
    }

    addConnectionStatusListener(): void {
        this.active = true;
    }

    removeConnectionStatusListener(): void {
        this.active = false;
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
