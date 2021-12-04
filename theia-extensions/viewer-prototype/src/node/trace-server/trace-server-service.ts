/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable no-null/no-null */
import { ChildProcess, spawn } from 'child_process';
import fs = require('fs');
import { injectable } from 'inversify';
import { PortBusy, StartTraceServerOptions, TraceServerConfigService } from '../../common/trace-server-config';
import treeKill = require('tree-kill');

const SUCCESS = 'success';

export interface ChildProcessWithPid extends ChildProcess {
    pid: number
}

@injectable()
export class TraceServerServiceImpl implements TraceServerConfigService {

    protected server?: ChildProcess;
    protected port?: number;

    async startTraceServer({ path, port }: StartTraceServerOptions = {}): Promise<string> {
        if (typeof port !== 'number') {
            throw new Error('no Trace Server port specified');
        } else if (this.isServerRunning(this.server)) {
            if (this.port === port) {
                return SUCCESS;
            } else {
                throw new Error('the Trace Server is already running on a different port');
            }
        }
        path = path?.trim() || await this.findTraceServerPath();
        if (!path) {
            throw new Error('no Trace Server path found');
        } else if (!await this.validateTraceServerPath(path)) {
            throw new Error(`could not find the Trace Server file at the specified path: ${path}`);
        }
        const server = spawn(path, ['-vmargs', `-Dtraceserver.port=${port}`]);
        if (server.pid === undefined) {
            // When pid is undefined it usually means we're about to get an error.
            return new Promise<never>((_, reject) => server.once('error', reject));
        }
        this.server = server;
        this.port = port;
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
        const { server } = this;
        if (!this.isServerRunning(server)) {
            return SUCCESS;
        }
        await new Promise<void>((resolve, reject) => {
            let exitTimeout: any;
            // Use `server.on('exit', ...)` as source of truth to detect if the server was successfully killed or not.
            server.once('exit', () => {
                clearTimeout(exitTimeout);
                resolve();
            });
            treeKill(server.pid, error => {
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

    protected async findTraceServerPath(): Promise<string | undefined> {
        const traceServerPath = process.env.TRACE_SERVER_PATH?.trim();
        if (traceServerPath) { return traceServerPath; }
    }

    protected async validateTraceServerPath(traceServerPath: string): Promise<boolean> {
        const stat = await fs.promises.stat(traceServerPath);
        return stat.isFile() && (stat.mode & fs.constants.R_OK) !== 0;
    }

    protected isServerRunning(server?: ChildProcess): server is ChildProcessWithPid {
        // When the process stops, one of `exitCode` or `signalCode` is set.
        return server !== undefined && server.exitCode === null && server.signalCode === null;
    }
}
