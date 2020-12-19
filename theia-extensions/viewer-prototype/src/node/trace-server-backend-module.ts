import { ContainerModule } from 'inversify';
import { TraceServerServiceImpl } from './trace-server-service';
import { ConnectionHandler, JsonRpcConnectionHandler } from '@theia/core/lib/common';
import { traceServerPath } from '../common/trace-server-config';
import { TraceServerConfigService } from '../common/trace-server-config';

export default new ContainerModule(bind => {
    bind(TraceServerServiceImpl).toSelf().inSingletonScope();

    bind(ConnectionHandler)
    .toDynamicValue(ctx => new JsonRpcConnectionHandler<TraceServerConfigService>(
        traceServerPath,
        () => ctx.container.get<TraceServerConfigService>(TraceServerServiceImpl),
    )).inSingletonScope();

});
