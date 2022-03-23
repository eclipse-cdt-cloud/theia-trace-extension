import { injectable, inject } from 'inversify';
import { CommandRegistry, CommandContribution, MessageService } from '@theia/core';
import { WidgetOpenerOptions, WidgetOpenHandler } from '@theia/core/lib/browser';
import URI from '@theia/core/lib/common/uri';
import { TraceViewerWidget, TraceViewerWidgetOptions } from './trace-viewer';
import { FileDialogService, OpenFileDialogProps } from '@theia/filesystem/lib/browser';
import { WorkspaceService } from '@theia/workspace/lib/browser/workspace-service';
import { OpenTraceCommand, StartServerCommand, StopServerCommand, TraceViewerCommand } from './trace-viewer-commands';
import { PortBusy, TraceServerConfigService } from '../../common/trace-server-config';
import { TracePreferences, TRACE_PATH, TRACE_ARGS } from '../trace-server-preference';
import { TspClient } from 'tsp-typescript-client/lib/protocol/tsp-client';
import { TspClientProvider } from '../tsp-client-provider-impl';

interface TraceViewerWidgetOpenerOptions extends WidgetOpenerOptions {
    traceUUID: string;
}

@injectable()
export class TraceViewerContribution extends WidgetOpenHandler<TraceViewerWidget> implements CommandContribution {

    private tspClient: TspClient;

    private constructor(
        @inject(TspClientProvider) private tspClientProvider: TspClientProvider
    ) {
        super();
        this.tspClient = this.tspClientProvider.getTspClient();
        this.tspClientProvider.addTspClientChangeListener(tspClient => this.tspClient = tspClient);
    }

    @inject(FileDialogService) protected readonly fileDialogService: FileDialogService;
    @inject(WorkspaceService) protected readonly workspaceService: WorkspaceService;
    @inject(TracePreferences) protected tracePreferences: TracePreferences;
    @inject(TraceServerConfigService) protected readonly traceServerConfigService: TraceServerConfigService;
    @inject(MessageService) protected readonly messageService: MessageService;

    readonly id = TraceViewerWidget.ID;
    readonly label = 'Trace Viewer';

    protected get path(): string | undefined {
        return this.tracePreferences[TRACE_PATH];
    }

    protected get args(): string | undefined {
        return this.tracePreferences[TRACE_ARGS];
    }

    protected createWidgetOptions(uri: URI, options?: TraceViewerWidgetOpenerOptions): TraceViewerWidgetOptions {
        return {
            traceURI: uri.path.toString(),
            traceUUID: options?.traceUUID
        };
    }

    protected async launchTraceServer(): Promise<void> {
        try {
            const healthResponse = await this.tspClient.checkHealth();
            if (healthResponse.getModel()?.status === 'UP') {
                this.openDialog();
            }
        } catch (outer) {
            const progress = await this.messageService.showProgress({ text: '' });
            progress.report({ message: 'Launching trace server... ', work: { done: 10, total: 100 } });
            const { path, args } = this;
            try {
                const resolve = await this.traceServerConfigService.startTraceServer({ path, args });
                if (resolve === 'success') {
                    if (this.args && this.args.length > 0) {
                        progress.report({ message: `Trace server started using the following arguments:  ${this.args}.`, work: { done: 100, total: 100 } });
                    } else {
                        progress.report({ message: 'Trace server started.', work: { done: 100, total: 100 } });
                    }
                    progress.cancel();
                    this.openDialog();
                }
            } catch (inner) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                if (PortBusy.is(inner as any)) {
                    if (this.args && this.args.length > 0) {
                        this.messageService.error(
                            `Error starting the server (port busy) using the following arguments: ${this.args}`);
                    } else {
                        this.messageService.error('Error starting the server (port busy)');
                    }
                } else {
                    this.messageService.error(
                        'Failed to start the trace server: no such file or directory. Please make sure that the path is correct in Trace Viewer settings and retry'
                    );
                }
                progress.cancel();
            }
        }
    }

    async openDialog(): Promise<void> {
        const props: OpenFileDialogProps = {
            title: 'Open Trace',
            // Only support selecting folders, both folders and file doesn't work in Electron (issue #227)
            canSelectFolders: true,
            canSelectFiles: false
        };
        const root = this.workspaceService.tryGetRoots()[0];
        const fileURI = await this.fileDialogService.showOpenDialog(props, root);
        if (fileURI) {
            await this.open(fileURI);
        }
    }

    async open(traceURI: URI, options?: TraceViewerWidgetOpenerOptions): Promise<TraceViewerWidget> {
        try {
            const healthResponse = await this.tspClient.checkHealth();
            if (healthResponse.getModel()?.status === 'UP') {
                return super.open(traceURI, options);
            }
        } catch (outer) {
            return this.messageService.showProgress({ text: '' }).then(async progress => {
                progress.report({ message: 'Launching trace server... ', work: { done: 10, total: 100 } });
                const { path, args } = this;
                try {
                    const resolve = await this.traceServerConfigService.startTraceServer({ path, args });
                    if (resolve === 'success') {
                        await this.waitForTraceServer(10_000);
                        if (this.args && this.args.length > 0) {
                            progress.report({ message: `Trace server started using the following arguments:  ${args}.`, work: { done: 100, total: 100 } });
                        } else {
                            progress.report({ message: 'Trace server started.', work: { done: 100, total: 100 } });
                        }
                        return super.open(traceURI, options);
                    }
                } catch (inner) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    if (PortBusy.is(inner as any)) {
                        if (this.args && this.args.length > 0) {
                            this.messageService.error(
                                `Error starting the server (port busy) using the following arguments: ${this.args}`);
                        } else {
                            this.messageService.error('Error starting the server (port busy)');
                        }
                    } else {
                        this.messageService.error(
                            'Failed to start the trace server: no such file or directory. Please make sure that the path is correct in Trace Viewer settings and retry'
                        );
                    }
                    throw inner;
                } finally {
                    progress.cancel();
                }
                throw outer;
            });
        }
        throw new Error('Could not open TraceViewerWidget');
    }

    registerCommands(registry: CommandRegistry): void {
        registry.registerCommand(OpenTraceCommand, {
            execute: () => this.launchTraceServer()
        });
        registry.registerCommand(TraceViewerCommand, {
            execute: (options: TraceViewerWidgetOpenerOptions) => this.open(new URI(''), options)
        });
        registry.registerCommand(StartServerCommand, {
            execute: async () => {
                const { path, args } = this;
                try {
                    await this.traceServerConfigService.startTraceServer({ path, args });
                    if (this.args && this.args.length > 0) {
                        this.messageService.info(`Trace server started using the following arguments:  ${this.args}.`);
                    } else {
                        this.messageService.info('Trace server started.');
                    }
                } catch (error) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    if (PortBusy.is(error as any)) {
                        if (this.args && this.args.length > 0) {
                            this.messageService.error(
                                `Error starting the server (port busy) using the following arguments: ${this.args}`);
                        } else {
                            this.messageService.error('Error starting the server (port busy)');
                        }
                    } else {
                        console.error(error);
                        this.messageService.error(
                            'Failed to start the trace server: no such file or directory. Please make sure that the path is correct in Trace Viewer settings and retry'
                        );
                    }

                }
            }
        });
        registry.registerCommand(StopServerCommand, {
            execute: async () => {
                try {
                    await this.traceServerConfigService.stopTraceServer();
                    this.messageService.info('Trace server terminated successfully.');
                } catch (err) {
                    this.messageService.error('Failed to stop the trace server.');
                }
            }
        });
    }

    canHandle(_uri: URI): number {
        return 100;
    }

    protected async waitForTraceServer(timeoutMs: number): Promise<void> {
        let timeout = false;
        const timeoutHandle = setTimeout(() => timeout = true, timeoutMs);
        // Try fetching the Trace Server health, repeat on error only.
        // If we get a response of some sort, it means the HTTP server is up somehow.
        while (true) {
            try {
                await this.tspClient.checkHealth();
                clearTimeout(timeoutHandle);
                return;
            } catch (error) {
                if (timeout) {
                    throw error;
                }
                console.error(error);
            }
        }
    }
}
