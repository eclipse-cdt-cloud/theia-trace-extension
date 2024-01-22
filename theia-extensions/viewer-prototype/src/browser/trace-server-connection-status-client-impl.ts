/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { injectable } from 'inversify';
import { TraceServerConnectionStatusClient } from '../common/trace-server-connection-status';

type Listener = (serverStatus: boolean) => void;
@injectable()
export class TraceServerConnectionStatusClientImpl implements TraceServerConnectionStatusClient {
    protected active = false;
    protected _status = false;
    protected listeners: Listener[] = [];

    public updateStatus(status: boolean): void {
        this._status = status;
        if (this.active) {
            this.listeners.forEach(fn => fn(status));
        }
    }

    public activate(): void {
        this.active = true;
    }

    public deactivate(): void {
        this.active = false;
    }

    public addServerStatusChangeListener(fn: Listener): void {
        this.listeners.push(fn);
    }

    public removeServerStatusChangeListener(fn: Listener): void {
        const index = this.listeners.indexOf(fn);
        if (index) {
            this.listeners.splice(index, 1);
        }
    }

    get status(): boolean {
        return this._status;
    }
}
