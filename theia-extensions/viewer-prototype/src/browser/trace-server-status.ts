/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { injectable } from 'inversify';
import { RestClient, ConnectionStatusListener } from 'tsp-typescript-client/lib/protocol/rest-client';

@injectable()
export class TraceServerConnectionStatusService {
    private connectionStatusListener: ConnectionStatusListener;

    private constructor() {
        this.connectionStatusListener = (status: boolean) => {
            TraceServerConnectionStatusService.renderStatus(status);
        };
    }

    public addConnectionStatusListener(): void {
        RestClient.addConnectionStatusListener(this.connectionStatusListener);
    }

    public removeConnectionStatusListener(): void {
        RestClient.removeConnectionStatusListener(this.connectionStatusListener);
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
