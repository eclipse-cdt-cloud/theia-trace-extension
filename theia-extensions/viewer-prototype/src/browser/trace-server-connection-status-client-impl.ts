/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { injectable } from '@theia/core/shared/inversify';
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
}
