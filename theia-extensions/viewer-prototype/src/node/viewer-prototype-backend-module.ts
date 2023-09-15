import { ContainerModule } from '@theia/core/shared/inversify';
import { ConnectionHandler, JsonRpcConnectionHandler } from '@theia/core/lib/common';
import { TRACE_SERVER_CLIENT, traceServerPath } from '../common/trace-server-config';
import { TraceServerConfigService } from '../common/trace-server-config';
import { BackendFileService, backendFileServicePath } from '../common/backend-file-service';
import { BackendFileServiceImpl } from './backend-file-service-impl';
import { PortPreferenceProxy, TRACE_SERVER_PORT, TraceServerUrlProvider } from '../common/trace-server-url-provider';
import { TraceServerUrlProviderImpl } from './trace-server-url-provider-impl';
import { BackendApplicationContribution } from '@theia/core/lib/node';
import { LazyTspClientFactory } from 'traceviewer-base/lib/lazy-tsp-client';
import { TraceServerConnectionStatusBackendImpl } from './trace-server-connection-status-backend-impl';
import {
    TRACE_SERVER_CONNECTION_STATUS,
    TraceServerConnectionStatusBackend,
    TraceServerConnectionStatusClient
} from '../common/trace-server-connection-status';

export default new ContainerModule(bind => {
    bind(LazyTspClientFactory).toFunction(LazyTspClientFactory);
    bind(BackendFileService).to(BackendFileServiceImpl).inSingletonScope();
    bind(TraceServerUrlProviderImpl).toSelf().inSingletonScope();
    bind(TraceServerUrlProvider).to(TraceServerUrlProviderImpl).inSingletonScope();
    bind(BackendApplicationContribution).toService(TraceServerUrlProvider);
    bind(PortPreferenceProxy).toService(TraceServerUrlProvider);
    bind(TraceServerConnectionStatusBackend).to(TraceServerConnectionStatusBackendImpl).inSingletonScope();
    bind(ConnectionHandler)
        .toDynamicValue(
            ctx =>
                new JsonRpcConnectionHandler<TraceServerConfigService>(traceServerPath, () =>
                    ctx.container.get<TraceServerConfigService>(TraceServerConfigService)
                )
        )
        .inSingletonScope();
    bind(ConnectionHandler)
        .toDynamicValue(
            ctx =>
                new JsonRpcConnectionHandler(backendFileServicePath, () =>
                    ctx.container.get<BackendFileService>(BackendFileService)
                )
        )
        .inSingletonScope();
    bind(ConnectionHandler)
        .toDynamicValue(
            ctx =>
                new JsonRpcConnectionHandler(TRACE_SERVER_CLIENT, () => {
                    const provider = ctx.container.get<TraceServerUrlProvider>(TraceServerUrlProvider);
                    const lazyTspClientFactory = ctx.container.get<LazyTspClientFactory>(LazyTspClientFactory);
                    return lazyTspClientFactory(() => provider.getTraceServerUrlPromise());
                })
        )
        .inSingletonScope();
    bind(ConnectionHandler)
        .toDynamicValue(
            ctx =>
                new JsonRpcConnectionHandler(TRACE_SERVER_PORT, () =>
                    ctx.container.get<PortPreferenceProxy>(PortPreferenceProxy)
                )
        )
        .inSingletonScope();
    bind(ConnectionHandler)
        .toDynamicValue(
            ctx =>
                new JsonRpcConnectionHandler<TraceServerConnectionStatusClient>(
                    TRACE_SERVER_CONNECTION_STATUS,
                    client => {
                        const backend = ctx.container.get<TraceServerConnectionStatusBackend>(
                            TraceServerConnectionStatusBackend
                        );
                        backend.addClient(client);
                        client.onDidCloseConnection(() => {
                            backend.removeClient(client);
                        });
                        return backend;
                    }
                )
        )
        .inSingletonScope();
});
