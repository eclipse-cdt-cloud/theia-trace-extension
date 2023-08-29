import { injectable } from 'inversify';
import { RestClient } from 'tsp-typescript-client/lib/protocol/rest-client';
import {
    TraceServerConnectionStatusBackend,
    TraceServerConnectionStatusClient
} from '../common/trace-server-connection-status';

@injectable()
export class TraceServerConnectionStatusBackendImpl implements TraceServerConnectionStatusBackend {
    protected clients: TraceServerConnectionStatusClient[] = [];

    constructor() {
        const listener = (status: boolean) => {
            this.clients.forEach(client => client.updateStatus(status));
        };
        RestClient.addConnectionStatusListener(listener);
    }

    setClient(client: TraceServerConnectionStatusClient): void {
        this.clients.push(client);
    }

    removeClient(client: TraceServerConnectionStatusClient): void {
        const index = this.clients.indexOf(client);
        if (index > -1) {
            this.clients.splice(index, 1);
        }
    }
}
