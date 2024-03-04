import { injectable } from '@theia/core/shared/inversify';
import { RestClient } from 'tsp-typescript-client/lib/protocol/rest-client';
import {
    TraceServerConnectionStatusBackend,
    TraceServerConnectionStatusClient
} from '../common/trace-server-connection-status';

@injectable()
export class TraceServerConnectionStatusBackendImpl implements TraceServerConnectionStatusBackend {
    protected clients: TraceServerConnectionStatusClient[] = [];
    protected lastStatus = false;

    constructor() {
        const listener = (status: boolean) => {
            this.clients.forEach(client => client.updateStatus(status));
            this.lastStatus = status;
        };
        RestClient.addConnectionStatusListener(listener);
    }

    getStatus(): Promise<boolean> {
        return Promise.resolve(this.lastStatus);
    }

    addClient(client: TraceServerConnectionStatusClient): void {
        this.clients.push(client);
    }

    removeClient(client: TraceServerConnectionStatusClient): void {
        const index = this.clients.indexOf(client);
        if (index > -1) {
            this.clients.splice(index, 1);
        }
    }
}
