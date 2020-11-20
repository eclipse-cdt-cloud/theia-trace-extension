import { spawn, exec } from 'child_process';
import { injectable } from 'inversify';
import { TraceServerConfigService } from '../common/trace-server-config';
@injectable()
export class TraceServerServiceImpl implements TraceServerConfigService {

    async startTraceServer(path: string | undefined, port: number | undefined): Promise<void> {
        spawn(`${path}`, ['-vmargs', `-Dtraceserver.port=${port}`]);
    }

    async stopTraceServer(port: number | undefined): Promise<void> {
        exec(`kill -9 $(lsof -t -i:${port} -sTCP:LISTEN)`);  // FIXME: Better approach to kill the server at a given port
    }
}
