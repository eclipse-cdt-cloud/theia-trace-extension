import { ContainerModule } from '@theia/core/shared/inversify';
import { ConnectionHandler, JsonRpcConnectionHandler } from '@theia/core/lib/common';
import { traceServerPath } from '../common/trace-server-config';
import { TraceServerConfigService } from '../common/trace-server-config';
import { BackendFileService, backendFileServicePath } from '../common/backend-file-service';
import { BackendFileServiceImpl } from './backend-file-service-impl';

export default new ContainerModule(bind => {
    bind(BackendFileService).to(BackendFileServiceImpl).inSingletonScope();
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
});
