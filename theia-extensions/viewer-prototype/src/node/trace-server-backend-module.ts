import { ContainerModule } from 'inversify';
import { TraceServerServiceImpl } from './trace-server-service';
import { ConnectionHandler, JsonRpcConnectionHandler } from '@theia/core/lib/common';
import { traceServerPath } from '../common/trace-server-config';
import { TraceServerConfigService } from '../common/trace-server-config';
import { BackendFileService, backendFileServicePath } from '../common/backend-file-service';
import { BackendFileServiceImpl } from './backend-file-service-impl';

export default new ContainerModule(bind => {
    bind(TraceServerServiceImpl).toSelf().inSingletonScope();

    bind(ConnectionHandler)
    .toDynamicValue(ctx => new JsonRpcConnectionHandler<TraceServerConfigService>(
        traceServerPath,
        () => ctx.container.get<TraceServerConfigService>(TraceServerServiceImpl),
    )).inSingletonScope();

    bind(BackendFileService).to(BackendFileServiceImpl).inSingletonScope();

    bind(ConnectionHandler).toDynamicValue(ctx =>
        new JsonRpcConnectionHandler(backendFileServicePath,
            () => ctx.container.get<BackendFileService>(BackendFileService))
    ).inSingletonScope();
});
