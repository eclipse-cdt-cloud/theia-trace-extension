import { spawn } from 'child_process';
import { join } from 'path';
import { existsSync } from 'fs';
import { injectable } from 'inversify';
import { PortBusy, TraceServerConfigService } from '../common/trace-server-config';
import { FileOperationError, FileOperationResult } from '@theia/filesystem/lib/common/files';
import treeKill = require('tree-kill');
@injectable()
export class TraceServerServiceImpl implements TraceServerConfigService {
    private processId: number;

    startTraceServer(path: string | undefined, port: number | undefined): Promise<string> {
        if (typeof path === 'undefined') {
            throw new FileOperationError('The Trace Viwer path is not defined.', FileOperationResult.FILE_INVALID_PATH);
        }
        const serverPath = join(__dirname, '../../../../', path);
        if (existsSync(serverPath) === false) {
            throw new FileOperationError(`The Trace Viewer path (${serverPath}) was not found.`, FileOperationResult.FILE_NOT_FOUND);
        }
        const server = spawn(`${serverPath}`, ['-vmargs', `-Dtraceserver.port=${port}`]);
        this.processId = server.pid;
        const timeouts: NodeJS.Timeout[] = [];

        return new Promise<string>((resolve, reject) => {
            // TODO: Since the resolve never actually gets returned, we need a better way to determine if the child process
            // initiated by the spawn successfully starts the trace server

            // If the server doesn't error or exit within 2 seconds, we consider that a success.
            // That doesn't mean that the server has really started. On the frontend, the `TraceServerConnectionStatusService`
            // will ping the port until it receives a response, which is the official measure of success.

            timeouts.push(setTimeout(() => resolve('success'), 2000));

            // If the server exits or errors before it outputs, consider it a failure.
            server.on('error', err => {
                reject(err);
            });
            server.on('exit', code => {
                reject(PortBusy(code));
            });
            // If no response recieved from the trace server in 10 seconds, reject with an error (for internal use)
            timeouts.push(setTimeout(() => reject('Waited 10 seconds but nothing happened and hence exiting'), 10000));

        }).finally(() => {
            server.removeAllListeners();
            timeouts.forEach(timeout => clearTimeout(timeout));
        });

    }

    stopTraceServer(): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            if (this.processId === -1 || !this.processId) {
                reject('process already killed or process hasn\'t been started');
                return;
            }
            treeKill(this.processId, error => {
                this.processId = -1;
                if (error) {
                    reject(error);
                    return;
                }
                resolve('success');
            });
        });
    }
}
