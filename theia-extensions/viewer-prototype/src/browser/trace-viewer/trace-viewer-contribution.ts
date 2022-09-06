import { injectable, inject } from 'inversify';
import { CommandRegistry, CommandContribution, MessageService } from '@theia/core';
import { WidgetOpenerOptions, WidgetOpenHandler, KeybindingContribution, KeybindingRegistry } from '@theia/core/lib/browser';
import URI from '@theia/core/lib/common/uri';
import { TraceViewerWidget, TraceViewerWidgetOptions } from './trace-viewer';
import { FileDialogService, OpenFileDialogProps } from '@theia/filesystem/lib/browser';
import { WorkspaceService } from '@theia/workspace/lib/browser/workspace-service';
import { OpenTraceCommand, StartServerCommand, StopServerCommand, TraceViewerCommand, KeyboardShortcutsCommand, OpenTraceWithRootPathCommand } from './trace-viewer-commands';
import { PortBusy, TraceServerConfigService } from '../../common/trace-server-config';
import { TracePreferences, TRACE_PATH, TRACE_ARGS } from '../trace-server-preference';
import { TspClient } from 'tsp-typescript-client/lib/protocol/tsp-client';
import { TspClientProvider } from '../tsp-client-provider-impl';
import { ChartShortcutsDialog } from './../trace-explorer/trace-explorer-sub-widgets/trace-explorer-keyboard-shortcuts/charts-cheatsheet-component';
import { signalManager } from 'traceviewer-base/lib/signals/signal-manager';
import { TraceServerConnectionStatusService } from '../trace-server-status';
import { FileStat } from '@theia/filesystem/lib/common/files';

interface TraceViewerWidgetOpenerOptions extends WidgetOpenerOptions {
    traceUUID: string;
}

@injectable()
export class TraceViewerContribution extends WidgetOpenHandler<TraceViewerWidget> implements CommandContribution, KeybindingContribution {

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
    @inject(ChartShortcutsDialog) protected readonly chartShortcuts: ChartShortcutsDialog;

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

    protected async launchTraceServer(rootPath?: string): Promise<void> {
        let healthResponse;
        try {
            healthResponse = await this.tspClient.checkHealth();
        } catch (err) {
            // continue to start trace server
        }
        if (healthResponse && healthResponse.isOk() && healthResponse.getModel()?.status === 'UP') {
            this.openDialog(rootPath);
        } else {
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
                    this.openDialog(rootPath);
                }
            } catch (err) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                if (PortBusy.is(err as any)) {
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

    async openDialog(rootPath?: string): Promise<void> {
        const props: OpenFileDialogProps = {
            title: 'Open Trace',
            // Only support selecting folders, both folders and file doesn't work in Electron (issue #227)
            canSelectFolders: true,
            canSelectFiles: false
        };
        let fileURI = undefined;
        if (rootPath !== undefined) {
            const root = FileStat.dir(rootPath);
            fileURI = await this.fileDialogService.showOpenDialog(props, root);
        } else {
            const root = this.workspaceService.tryGetRoots()[0];
            fileURI = await this.fileDialogService.showOpenDialog(props, root);
        }
        if (fileURI) {
            await this.open(fileURI);
        }
    }

    async open(traceURI: URI, options?: TraceViewerWidgetOpenerOptions): Promise<TraceViewerWidget> {
        let healthResponse;
        try {
            healthResponse = await this.tspClient.checkHealth();
        } catch (err) {
            // continue to start trace server
        }
        if (healthResponse && healthResponse.isOk() && healthResponse.getModel()?.status === 'UP') {
            return super.open(traceURI, options);
        } else {
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
                    throw new Error('Could not start trace server: ' + resolve);
                } catch (err) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    if (PortBusy.is(err as any)) {
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
                    throw err;
                } finally {
                    progress.cancel();
                }
            });
        }
    }

    registerKeybindings(keybindings: KeybindingRegistry): void {
        keybindings.registerKeybinding({
            keybinding: 'ctrlcmd+f1',
            command: KeyboardShortcutsCommand.id,
        });
    }

    registerCommands(registry: CommandRegistry): void {
        registry.registerCommand(OpenTraceCommand, {
            execute: () => this.launchTraceServer()
        });
        registry.registerCommand(OpenTraceWithRootPathCommand, {
            isVisible: () => false,
            execute: rootPath => this.launchTraceServer(rootPath)
        });
        registry.registerCommand(TraceViewerCommand, {
            execute: (options: TraceViewerWidgetOpenerOptions) => this.open(new URI(''), options)
        });
        registry.registerCommand(StartServerCommand, {
            execute: async () => {
                const progress = await this.messageService.showProgress({ text: '' });
                progress.report({ message: 'Launching trace server... ', work: { done: 10, total: 100 } });
                const { path, args } = this;
                try {
                    const resolve = await this.traceServerConfigService.startTraceServer({ path, args });
                    if (resolve === 'success') {
                        await this.waitForTraceServer(10000);
                        if (this.args && this.args.length > 0) {
                            progress.report({ message: `Trace server started using the following arguments:  ${args}.`, work: { done: 100, total: 100 } });
                        } else {
                            progress.report({ message: 'Trace server started.', work: { done: 100, total: 100 } });
                        }
                        TraceServerConnectionStatusService.renderStatus(true);
                        signalManager().fireTraceServerStartedSignal();
                        return;
                    }
                    throw new Error('Could not start trace server: ' + resolve);
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
                } finally {
                    progress.cancel();
                }
            }
        });
        registry.registerCommand(StopServerCommand, {
            execute: async () => {
                try {
                    await this.traceServerConfigService.stopTraceServer();
                    this.messageService.info('Trace server terminated successfully.');
                    TraceServerConnectionStatusService.renderStatus(false);
                } catch (err) {
                    this.messageService.error('Failed to stop the trace server.');
                }
            }
        });
        registry.registerCommand(KeyboardShortcutsCommand, {
            execute: () => {
                this.chartShortcuts.open();
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
            let error;
            try {
                const healthResponse = await this.tspClient.checkHealth();
                if (healthResponse.isOk() && healthResponse.getModel()?.status === 'UP') {
                    clearTimeout(timeoutHandle);
                    return;
                }
                error = new Error('Unsuccessful health check: ' + healthResponse.getStatusMessage() + ' status: ' + healthResponse.getModel()?.status);
            } catch (err) {
                error = error;
            }
            if (timeout) {
                throw error;
            }
            console.error(error);
        }
    }
}
