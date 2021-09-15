import { spawn, ChildProcess } from 'child_process';
import { injectable } from 'inversify';
import { PortBusy, TraceServerConfigService } from '../common/trace-server-config';
import treeKill = require('tree-kill');

const SUCCESS = 'success';

@injectable()
export class TraceServerServiceImpl implements TraceServerConfigService {

    private server?: ChildProcess;
    private port?: number;

    async startTraceServer(path?: string, port?: number): Promise<string> {
        if (path === undefined) {
            throw new Error('no Trace Server path specified');
        } else if (port === undefined) {
            throw new Error('no Trace Server port specified');
        } else if (this.isServerRunning(this.server)) {
            if (this.port === port) {
                return SUCCESS;
            } else {
                throw new Error('the Trace Server is already running on a different port');
            }
        }
        const server = spawn(path, ['-vmargs', `-Dtraceserver.port=${port}`]);
        if (server.pid === undefined) {
            // When pid is undefined it usually means we're about to get an error.
            return new Promise<never>((_, reject) => server.once('error', reject));
        }
        this.server = server;
        this.port = port;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let timeout: any;
        try {
            await new Promise<void>((resolve, reject) => {
                // If the server doesn't error or exit within 2 seconds, we consider that a success.
                // That doesn't mean that the server has really started. On the frontend, the `TraceServerConnectionStatusService`
                // will ping the port until it receives a response, which is the official measure of success.
                timeout = setTimeout(resolve, 2000);
                server.once('exit', (code, _signal) => reject(PortBusy(code)));
                server.once('error', reject);
            });
        } catch (error) {
            this.server = undefined;
            this.port = undefined;
            throw error;
        } finally {
            server.removeAllListeners();
            clearTimeout(timeout);
        }
        server.once('exit', () => {
            this.server = undefined;
            this.port = undefined;
        });
        return SUCCESS;
    }

    async stopTraceServer(): Promise<string> {
        if (!this.isServerRunning(this.server)) {
            return SUCCESS;
        }
        await new Promise<void>((resolve, reject) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let exitTimeout: any;
            // Use `server.on('exit', ...)` as source of truth to detect if the server was successfully killed or not.
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            this.server!.once('exit', () => {
                clearTimeout(exitTimeout);
                resolve();
            });
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            treeKill(this.server!.pid!, error => {
                if (error) {
                    reject(error);
                } else {
                    // Give `server.on('exit', ...)` 1s to fire before rejecting with an error.
                    exitTimeout = setTimeout(() => reject(new Error('the Trace Server did not exit')), 1000);
                }
            });
        });
        return SUCCESS;
    }

    protected isServerRunning(server?: ChildProcess): boolean {
        return server !== undefined &&
            // When the process stops, one of `exitCode` or `signalCode` is set.
            // eslint-disable-next-line no-null/no-null
            server.exitCode === null && server.signalCode === null;
    }
}
