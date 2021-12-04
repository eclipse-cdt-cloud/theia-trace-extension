import { ContainerModule } from '@theia/core/shared/inversify';
import { TraceServerConfigService } from '../../common/trace-server-config';
import { ElectronTraceServerServiceImpl } from './electron-trace-server-service';

export default new ContainerModule(bind => {
    bind(TraceServerConfigService).to(ElectronTraceServerServiceImpl).inSingletonScope();
});
