import { spawn, exec } from 'child_process';
import { injectable } from 'inversify';
import { TraceServerConfigService } from '../common/trace-server-config';
@injectable()
export class TraceServerServiceImpl implements TraceServerConfigService {

    startTraceServer(path: string | undefined, port: number | undefined): Promise<void> {
        const server = spawn(`${path}`, ['-vmargs', `-Dtraceserver.port=${port}`]);
        return new Promise<void>((resolve, reject) => {
            // If the server provides output on any channel before it exits, consider that a success.
            // That doesn't mean that the server has really started. On the frontend, the `TraceServerConnectionStatusService`
            // will ping the port until it receives a response, which is the official measure of success.
            server.stdout.on('data', () => resolve());
            server.stderr.on('data', () => resolve());
            // If the server exits or errors before it outputs, consider it a failure.
            server.on('exit', code => reject(code));
            server.on('error', error => reject(error));
        })
            .finally(() => { server.removeAllListeners(); });
    }

    stopTraceServer(port: number | undefined): Promise<void> {
        const terminator = exec(`kill -9 $(lsof -t -i:${port} -sTCP:LISTEN)`);  // FIXME: Better approach to kill the server at a given port
        return new Promise((resolve, reject) => {
            terminator.on('exit', code => {
                if (code === 0 || code === 1) {
                    resolve();
                } else {
                    reject(code);
                }
            });
        });
    }
}
