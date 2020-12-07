import { MessageService, Path } from '@theia/core';
import { FileSystem, FileStat } from '@theia/filesystem/lib/common/filesystem';
import { ApplicationShell, Message, StatusBar } from '@theia/core/lib/browser';
import { ReactWidget } from '@theia/core/lib/browser/widgets/react-widget';
import { inject, injectable } from 'inversify';
import * as React from 'react';
import { OutputDescriptor } from 'tsp-typescript-client/lib/models/output-descriptor';
import { Trace } from 'tsp-typescript-client/lib/models/trace';
import { TspClient } from 'tsp-typescript-client/lib/protocol/tsp-client';
import { TspClientProvider } from '../tsp-client-provider';
import { TraceManager } from '@trace-viewer/base/lib/trace-manager';
import { Emitter } from '@theia/core';
import { ExperimentManager } from '@trace-viewer/base/lib/experiment-manager';
import { OutputAddedSignalPayload, TraceExplorerWidget } from '../trace-explorer/trace-explorer-widget';
import { TraceContextComponent } from '@trace-viewer/react-components/lib/components/trace-context-component';
import { Experiment } from 'tsp-typescript-client/lib/models/experiment';
import URI from '@theia/core/lib/common/uri';
import { TheiaMessageManager } from '../theia-message-manager';
import { ThemeService } from '@theia/core/lib/browser/theming';
import { signalManager } from '@trace-viewer/base/lib/signal-manager';

export const TraceViewerWidgetOptions = Symbol('TraceViewerWidgetOptions');
export interface TraceViewerWidgetOptions {
    traceURI: string;
}

@injectable()
export class TraceViewerWidget extends ReactWidget {
    static ID = 'trace-viewer';
    static LABEL = 'Trace Viewer';

    protected readonly uri: Path;
    private openedExperiment: Experiment | undefined;
    private outputDescriptors: OutputDescriptor[] = [];
    private tspClient: TspClient;
    private traceManager: TraceManager;
    private experimentManager: ExperimentManager;
    private backgroundTheme: string;

    private resizeHandlers: (() => void)[] = [];
    private readonly addResizeHandler = (h: () => void) => {
        this.resizeHandlers.push(h);
    };

    private static widgetActivatedEmitter = new Emitter<Experiment>();
    public static widgetActivatedSignal = TraceViewerWidget.widgetActivatedEmitter.event;

    constructor(
        @inject(TraceViewerWidgetOptions) protected readonly options: TraceViewerWidgetOptions,
        @inject(TspClientProvider) private tspClientProvider: TspClientProvider,
        @inject(StatusBar) private statusBar: StatusBar,
        @inject(FileSystem) private readonly fileSystem: FileSystem,
        @inject(ApplicationShell) protected readonly shell: ApplicationShell,
        @inject(TheiaMessageManager) private readonly _signalHandler: TheiaMessageManager,
        @inject(MessageService) protected readonly messageService: MessageService
    ) {
        super();
        this.uri = new Path(this.options.traceURI);
        this.id = 'theia-traceOpen';
        this.title.label = 'Trace: ' + this.uri.base;
        this.title.closable = true;
        this.addClass('theia-trace-open');
        this.toDispose.push(TraceExplorerWidget.outputAddedSignal(output => this.onOutputAdded(output)));
        this.toDispose.push(TraceExplorerWidget.experimentSelectedSignal(experiment => this.onExperimentSelected(experiment)));
        this.backgroundTheme = ThemeService.get().getCurrentTheme().type;
        ThemeService.get().onThemeChange(() => this.updateBackgroundTheme());
        this.initialize();
        this.tspClient = this.tspClientProvider.getTspClient();
        this.traceManager = this.tspClientProvider.getTraceManager();
        this.experimentManager = this.experimentManager = this.tspClientProvider.getExperimentManager();
        this.tspClientProvider.addTspClientChangeListener(tspClient => {
            this.tspClient = tspClient;
            this.traceManager = this.tspClientProvider.getTraceManager();
            this.experimentManager = this.experimentManager = this.tspClientProvider.getExperimentManager();
        });
    }

    private updateBackgroundTheme() {
        const currentThemeType = ThemeService.get().getCurrentTheme().type;
        signalManager().fireThemeChangedSignal(currentThemeType);
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
                progress.report({message: 'Finding traces ', work: {done: 10, total: 100}});
                    if (fileStat) {
                        if (fileStat.isDirectory) {
                            // Find recursivly CTF traces
                            await this.findTraces(fileStat, tracesArray, isCancelled);
                        } else {
                            // Open single trace file
                            tracesArray.push(this.uri);
                        }
                    }

                    const traces = new Array<Trace>();
                    if (isCancelled.value) {
                        progress.report({message: 'Complete', work: {done: 100, total: 100}});
                        this.dispose();
                        return;
                    }

                    progress.report({message: 'Opening traces', work: {done: 30, total: 100}});
                    for (let i = 0; i < tracesArray.length; i++) {
                        if (isCancelled.value) {
                            break;
                        }
                        const trace = await this.traceManager.openTrace(tracesArray[i].toString(), tracesArray[i].name);
                        if (trace) {
                            traces.push(trace);
                        }
                    }

                    if (isCancelled.value) {
                        // Rollback traces
                        progress.report({message: 'Rolling back traces', work: {done: 50, total: 100}});
                        for (let i = 0; i < traces.length; i++) {
                            await this.traceManager.closeTrace(traces[i].UUID);
                        }
                        progress.report({message: 'Complete', work: {done: 100, total: 100}});
                        this.dispose();
                        return;
                    }
                    progress.report({message: 'Merging traces', work: {done: 70, total: 100}});
                    const experiment = await this.experimentManager.openExperiment(this.uri.name, traces);
                    if (experiment) {
                        this.openedExperiment = experiment;
                        this.title.label = 'Trace: ' + experiment.name;
                        this.id = experiment.UUID;

                        if (this.isVisible) {
                            TraceViewerWidget.widgetActivatedEmitter.fire(experiment);
                        }
                    }

                    this.update();
                } catch (e) {
                    console.log(e);
                    this.dispose();
                }
            progress.report({message: 'Complete', work: {done: 100, total: 100}});
            progress.cancel();
        });
    }

    onCloseRequest(msg: Message): void {
        if (this.openedExperiment) {
            // Close experiment
            this.experimentManager.closeExperiment(this.openedExperiment.UUID);
        }
        this.statusBar.removeElement('time-selection-range');
        super.onCloseRequest(msg);
    }

    onAfterShow(msg: Message): void {
        super.onAfterShow(msg);
        if (this.openedExperiment) {
            TraceViewerWidget.widgetActivatedEmitter.fire(this.openedExperiment);
        }
    }

    onActivateRequest(msg: Message): void {
        super.onActivateRequest(msg);
        if (this.openedExperiment) {
            TraceViewerWidget.widgetActivatedEmitter.fire(this.openedExperiment);
        }
    }

    protected onResize(): void {
        this.resizeHandlers.forEach(h => h());
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

    private onOutputAdded(payload: OutputAddedSignalPayload) {
        if (this.openedExperiment && payload.getExperiment().UUID === this.openedExperiment.UUID) {
            const exist = this.outputDescriptors.find(output => output.id === payload.getOutputDescriptor().id);
            if (!exist) {
                this.outputDescriptors.push(payload.getOutputDescriptor());
                this.update();
            }
        }
    }

    private onOutputRemoved(outputId: string) {
        const outputToKeep = this.outputDescriptors.filter(output => output.id !== outputId);
        this.outputDescriptors = outputToKeep;
        this.update();
    }

    private onExperimentSelected(experiment: Experiment) {
        if (this.openedExperiment && this.openedExperiment.UUID === experiment.UUID) {
            this.shell.activateWidget(this.openedExperiment.UUID);
        }
    }

    /*
     * TODO: use backend service to find traces
     */
    private async findTraces(rootStat: FileStat | undefined, traces: Array<Path>, isCancelled: { value: boolean; }) {
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
    private isCtf(stat: FileStat): boolean {
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
