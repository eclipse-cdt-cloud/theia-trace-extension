/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { injectable } from 'inversify';
import { TraceServerConnectionStatusClient } from '../common/trace-server-connection-status';

type Listener = (serverStatus: boolean) => void;
@injectable()
export class TraceServerConnectionStatusClientImpl implements TraceServerConnectionStatusClient {
    protected active = false;
    protected lastStatus = false;
    protected listeners: Listener[] = [];

    updateStatus(status: boolean): void {
        if (this.active) {
            this.lastStatus = status;
            this.listeners.forEach(listener => listener(status));
        }
    }

    activate(): void {
        this.active = true;
    }

    deactivate(): void {
        this.active = false;
    }

    addServerStatusChangeListener(listener: Listener): void {
        this.listeners.push(listener);
    }

    removeServerStatusChangeListener(listener: Listener): void {
        const index = this.listeners.indexOf(listener);
        if (index) {
            this.listeners.splice(index, 1);
        }
    }

    getStatus(): boolean {
        return this.lastStatus;
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
