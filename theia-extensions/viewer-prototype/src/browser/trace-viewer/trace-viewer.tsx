import { DisposableCollection, MessageService, Path } from '@theia/core';
import { FileSystem, FileStat } from '@theia/filesystem/lib/common/filesystem';
import { ApplicationShell, Message, StatusBar, WidgetManager } from '@theia/core/lib/browser';
import { ReactWidget } from '@theia/core/lib/browser/widgets/react-widget';
import { inject, injectable, postConstruct } from 'inversify';
import * as React from 'react';
import { OutputDescriptor } from 'tsp-typescript-client/lib/models/output-descriptor';
import { Trace } from 'tsp-typescript-client/lib/models/trace';
import { TspClient } from 'tsp-typescript-client/lib/protocol/tsp-client';
import { TspClientProvider } from '../tsp-client-provider';
import { TraceManager } from '@trace-viewer/base/lib/trace-manager';
import { ExperimentManager } from '@trace-viewer/base/lib/experiment-manager';
import { TraceContextComponent } from '@trace-viewer/react-components/lib/components/trace-context-component';
import { Experiment } from 'tsp-typescript-client/lib/models/experiment';
import URI from '@theia/core/lib/common/uri';
import { TheiaMessageManager } from '../theia-message-manager';
import { ThemeService } from '@theia/core/lib/browser/theming';
import { signalManager, Signals } from '@trace-viewer/base/lib/signal-manager';
import { OutputAddedSignalPayload } from '../trace-explorer/output-added-signal-payload';
import { TraceExplorerWidget } from '../trace-explorer/trace-explorer-widget';

export const TraceViewerWidgetOptions = Symbol('TraceViewerWidgetOptions');
export interface TraceViewerWidgetOptions {
    traceURI: string;
    traceUUID?: string;
}

@injectable()
export class TraceViewerWidget extends ReactWidget {
    static ID = 'trace-viewer';
    static LABEL = 'Trace Viewer';

    protected uri: Path;
    protected openedExperiment: Experiment | undefined;
    protected outputDescriptors: OutputDescriptor[] = [];
    protected tspClient: TspClient;
    protected traceManager: TraceManager;
    protected experimentManager: ExperimentManager;
    protected backgroundTheme: string;

    protected resizeHandlers: (() => void)[] = [];
    protected readonly addResizeHandler = (h: () => void): void => {
        this.resizeHandlers.push(h);
    };

    protected explorerWidget: TraceExplorerWidget;

    @inject(WidgetManager) protected readonly widgetManager: WidgetManager;
    @inject(TraceViewerWidgetOptions) protected readonly options: TraceViewerWidgetOptions;
    @inject(TspClientProvider) protected tspClientProvider: TspClientProvider;
    @inject(StatusBar) protected statusBar: StatusBar;
    @inject(FileSystem) protected readonly fileSystem: FileSystem;
    @inject(ApplicationShell) protected readonly shell: ApplicationShell;
    @inject(TheiaMessageManager) protected readonly _signalHandler: TheiaMessageManager;
    @inject(MessageService) protected readonly messageService: MessageService;

    @postConstruct()
    async init(): Promise<void> {
        this.uri = new Path(this.options.traceURI);
        this.id = 'theia-traceOpen';
        this.title.label = 'Trace: ' + this.uri.base;
        this.title.closable = true;
        this.addClass('theia-trace-open');
        this.backgroundTheme = ThemeService.get().getCurrentTheme().type;
        ThemeService.get().onThemeChange(() => this.updateBackgroundTheme());
        if (!this.options.traceUUID) {
            this.initialize();
        }
        this.tspClient = this.tspClientProvider.getTspClient();
        this.traceManager = this.tspClientProvider.getTraceManager();
        this.experimentManager = this.tspClientProvider.getExperimentManager();
        this.tspClientProvider.addTspClientChangeListener(tspClient => {
            this.tspClient = tspClient;
            this.traceManager = this.tspClientProvider.getTraceManager();
            this.experimentManager = this.tspClientProvider.getExperimentManager();
        });
        this.toDispose.push(this.widgetManager.onDidCreateWidget(({ widget }) => {
            if (widget instanceof TraceExplorerWidget) {
                this.explorerWidget = widget;
                this.subscribeToExplorerEvents();
            }
        }));
        this.explorerWidget = await this.widgetManager.getOrCreateWidget(TraceExplorerWidget.ID);
        if (this.options.traceUUID) {
            const experiment = this.explorerWidget.getExperiment(this.options.traceUUID);
            if (experiment) {
                this.openedExperiment = experiment;
                this.title.label = 'Trace: ' + experiment.name;
                this.id = experiment.UUID;
                this.experimentManager.addExperiment(experiment);
                signalManager().emit(Signals.EXPERIMENT_OPENED, { experiment: experiment });
                if (this.isVisible) {
                    this.explorerWidget.onOpenedTracesWidgetActivated(experiment);
                }
            }
            this.update();
        }
        this.subscribeToExplorerEvents();
        this.toDispose.push(this.toDisposeOnNewExplorer);
        // Make node focusable so it can achieve focus on activate (avoid warning);
        this.node.tabIndex = 0;
    }

    protected readonly toDisposeOnNewExplorer = new DisposableCollection();

    protected subscribeToExplorerEvents(): void {
        this.toDisposeOnNewExplorer.dispose();
        this.toDisposeOnNewExplorer.push(this.explorerWidget.outputAddedSignal(output => this.onOutputAdded(output)));
        signalManager().on(Signals.EXPERIMENT_SELECTED, (experiment: Experiment) => this.onExperimentSelected(experiment));
        signalManager().on(Signals.TRACEVIEWER_CLOSED, (UUID: string) => this.onCloseExperiment(UUID));
    }

    protected updateBackgroundTheme(): void {
        const currentThemeType = ThemeService.get().getCurrentTheme().type;
        signalManager().fireThemeChangedSignal(currentThemeType);
    }

    dispose(): void {
        super.dispose();
        signalManager().off(Signals.EXPERIMENT_SELECTED, (experiment: Experiment) => this.onExperimentSelected(experiment));
        signalManager().off(Signals.TRACEVIEWER_CLOSED, (UUID: string) => this.onCloseExperiment(UUID));
    }

    async initialize(): Promise<void> {
        /*
         * TODO: use backend service to find traces
         */

        const isCancelled = { value: false };

        // This will show a progress dialog with "Cancel" option
        this.messageService.showProgress({
            text: 'Open traces'
        },
            () => {
                isCancelled.value = true;
            })
            .then(async progress => {
                try {
                    const tracesArray = new Array<Path>();
                    const fileStat = await this.fileSystem.getFileStat(this.uri.toString());
                    progress.report({ message: 'Finding traces ', work: { done: 10, total: 100 } });
                    if (fileStat) {
                        if (fileStat.isDirectory) {
                            // Find recursivly CTF traces
                            await this.findTraces(fileStat, tracesArray, isCancelled);
                        } else {
                            // Open single trace file
                            tracesArray.push(this.uri);
                        }
                    }

                    // Check if the folder is empty.
                    if (tracesArray.length === 0) {
                        progress.report({ message: 'Complete', work: { done: 100, total: 100 } });
                        progress.cancel();
                        this.messageService.error('No valid traces found in the selected directory: ' + this.uri);
                        this.dispose();
                        return;
                    }

                    const traces = new Array<Trace>();
                    if (isCancelled.value) {
                        progress.report({ message: 'Complete', work: { done: 100, total: 100 } });
                        this.dispose();
                        return;
                    }

                    progress.report({ message: 'Opening traces', work: { done: 30, total: 100 } });
                    const invalidTraces = new Array<string>();
                    for (let i = 0; i < tracesArray.length; i++) {
                        if (isCancelled.value) {
                            break;
                        }
                        const trace = await this.traceManager.openTrace(tracesArray[i].toString(), tracesArray[i].name + tracesArray[i].ext);
                        if (trace) {
                            traces.push(trace);
                        } else {
                            invalidTraces.push(tracesArray[i].name.concat(tracesArray[i].ext));
                        }
                    }

                    if (isCancelled.value) {
                        // Rollback traces
                        progress.report({ message: 'Rolling back traces', work: { done: 50, total: 100 } });
                        for (let i = 0; i < traces.length; i++) {
                            await this.traceManager.closeTrace(traces[i].UUID);
                        }
                        progress.report({ message: 'Complete', work: { done: 100, total: 100 } });
                        this.dispose();
                        return;
                    }
                    progress.report({ message: 'Merging traces', work: { done: 70, total: 100 } });

                    if (traces === undefined || traces.length === 0) {
                        // All the traces are invalid. Display the error message and exit.
                        this.messageService.error('Invalid trace(s): ' + invalidTraces.toString());
                        this.dispose();
                    } else {
                        const experiment = await this.experimentManager.openExperiment(this.uri.name + this.uri.ext, traces);
                        if (experiment) {
                            this.openedExperiment = experiment;
                            this.title.label = 'Trace: ' + experiment.name;
                            this.id = experiment.UUID;

                            if (this.isVisible) {
                                this.explorerWidget.onOpenedTracesWidgetActivated(experiment);
                            }
                        }
                        // Check if there are any invalid traces and display the warning message with the names of the invalid traces if any.
                        if (Array.isArray(invalidTraces) && invalidTraces.length) {
                            this.messageService.warn('Invalid trace(s): ' + invalidTraces.toString());
                        }
                    }
                    this.update();
                } catch (e) {
                    this.dispose();
                }
                progress.report({ message: 'Complete', work: { done: 100, total: 100 } });
                progress.cancel();
            });
    }

    onCloseRequest(msg: Message): void {
        this.statusBar.removeElement('time-selection-range');
        super.onCloseRequest(msg);
    }

    onAfterShow(msg: Message): void {
        super.onAfterShow(msg);
        if (this.openedExperiment) {
            this.explorerWidget.onOpenedTracesWidgetActivated(this.openedExperiment);
        }
    }

    onActivateRequest(msg: Message): void {
        super.onActivateRequest(msg);
        if (this.openedExperiment) {
            this.explorerWidget.onOpenedTracesWidgetActivated(this.openedExperiment);
        }
        this.node.focus();
    }

    protected onResize(): void {
        this.resizeHandlers.forEach(h => h());
    }

    protected onCloseExperiment(UUID: string): void {
        this.shell.closeWidget(UUID);
    }

    protected render(): React.ReactNode {
        this.onOutputRemoved = this.onOutputRemoved.bind(this);
        return <div className='trace-viewer-container'>
            {this.openedExperiment ? <TraceContextComponent experiment={this.openedExperiment}
                tspClient={this.tspClient}
                outputs={this.outputDescriptors}
                onOutputRemove={this.onOutputRemoved}
                addResizeHandler={this.addResizeHandler}
                backgroundTheme={this.backgroundTheme}
                messageManager={this._signalHandler} /> : 'Trace is loading...'}
        </div>;
    }

    protected onOutputAdded(payload: OutputAddedSignalPayload): void {
        if (this.openedExperiment && payload.getExperiment().UUID === this.openedExperiment.UUID) {
            const exist = this.outputDescriptors.find(output => output.id === payload.getOutputDescriptor().id);
            if (!exist) {
                this.outputDescriptors.push(payload.getOutputDescriptor());
                this.update();
            }
        }
    }

    protected onOutputRemoved(outputId: string): void {
        const outputToKeep = this.outputDescriptors.filter(output => output.id !== outputId);
        this.outputDescriptors = outputToKeep;
        this.update();
    }

    protected onExperimentSelected(experiment: Experiment): void {
        if (this.openedExperiment && this.openedExperiment.UUID === experiment.UUID) {
            this.shell.activateWidget(this.openedExperiment.UUID);
        }
    }

    /*
     * TODO: use backend service to find traces
     */
    protected async findTraces(rootStat: FileStat | undefined, traces: Array<Path>, isCancelled: { value: boolean; }): Promise<void> {
        /**
         * If single file selection then return single trace in traces, if directory then find
         * recoursivly CTF traces in starting from root directory.
         */
        if (rootStat) {
            if (isCancelled.value) {
                return;
            }
            if (rootStat.isDirectory) {
                const isCtf = this.isCtf(rootStat);
                if (isCtf) {
                    const uri = new URI(rootStat.uri);
                    traces.push(uri.path);
                } else {
                    if (rootStat.children) {
                        for (let i = 0; i < rootStat.children.length; i++) {
                            if (isCancelled.value) {
                                return;
                            }
                            const fileStat = await this.fileSystem.getFileStat(rootStat.children[i].uri);
                            await this.findTraces(fileStat, traces, isCancelled);
                        }
                    }
                }
            }
        }
    }
    protected isCtf(stat: FileStat): boolean {
        if (stat.children) {
            for (let i = 0; i < stat.children.length; i++) {
                const path = new Path(stat.children[i].uri);
                if (path.name === 'metadata') {
                    return true;
                }
            }
        }
        return false;
    }
}
