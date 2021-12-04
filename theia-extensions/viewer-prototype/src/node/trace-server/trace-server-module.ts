import { ContainerModule } from '@theia/core/shared/inversify';
import { TraceServerConfigService } from '../../common/trace-server-config';
import { TraceServerServiceImpl } from './trace-server-service';

export default new ContainerModule(bind => {
    bind(TraceServerConfigService).to(TraceServerServiceImpl).inSingletonScope();
});
