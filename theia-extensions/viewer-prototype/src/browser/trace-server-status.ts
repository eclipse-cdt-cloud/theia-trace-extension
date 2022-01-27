/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { injectable } from 'inversify';
import { RestClient, ConnectionStatusListener } from 'tsp-typescript-client/lib/protocol/rest-client';

@injectable()
export class TraceServerConnectionStatusService {

    private connectionStatusListener: ConnectionStatusListener;

    private constructor() {
        this.connectionStatusListener = ((status: boolean) => {
            if (status) {
                this.renderSuccess();
            } else {
                this.renderFailure();
            }
        });
    }

    public addConnectionStatusListener(): void {
        RestClient.addConnectionStatusListener(this.connectionStatusListener);
    }

    public removeConnectionStatusListener(): void {
        RestClient.removeConnectionStatusListener(this.connectionStatusListener);
    }

    private renderSuccess(): void {
        if (document.getElementById('trace.viewer.serverCheck')) {
            document.getElementById('trace.viewer.serverCheck')!.className = 'fa fa-check-circle-o fa-lg';
            document.getElementById('trace.viewer.serverCheck')!.title = 'Server health and latency are good. No known issues';
            document.getElementById('trace.viewer.serverCheck')!.style.color = 'green';
        }
    }

    private renderFailure(): void {
        if (document.getElementById('trace.viewer.serverCheck')) {
            document.getElementById('trace.viewer.serverCheck')!.className = 'fa fa-times-circle-o fa-lg';
            document.getElementById('trace.viewer.serverCheck')!.title = 'Trace Viewer Critical Error: Trace Server Offline';
            document.getElementById('trace.viewer.serverCheck')!.style.color = 'red';
        }
    }
}
