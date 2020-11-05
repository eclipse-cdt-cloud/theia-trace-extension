import { Path } from '@theia/core';
import { FileSystem, FileStat } from '@theia/filesystem/lib/common/filesystem';
import { ApplicationShell, Message, StatusBar } from '@theia/core/lib/browser';
import { ReactWidget } from '@theia/core/lib/browser/widgets/react-widget';
import { inject, injectable } from 'inversify';
import * as React from 'react';
import { OutputDescriptor } from 'tsp-typescript-client/lib/models/output-descriptor';
import { Trace } from 'tsp-typescript-client/lib/models/trace';
import { TspClient } from 'tsp-typescript-client/lib/protocol/tsp-client';
import { TspClientProvider } from '../tsp-client-provider';
import { TraceManager } from '../../common/trace-manager';
import { Emitter } from '@theia/core';
import { ExperimentManager } from '../../common/experiment-manager';
import { OutputAddedSignalPayload, TraceExplorerWidget } from '../trace-explorer/trace-explorer-widget';
import { TraceContextComponent } from './components/trace-context-component';
import { Experiment } from 'tsp-typescript-client/lib/models/experiment';
import URI from '@theia/core/lib/common/uri';

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

    private resizeHandlers: (() => void)[] = [];
    private readonly addResizeHandler = (h: () => void) => {
        this.resizeHandlers.push(h);
    };

    private static widgetActivatedEmitter = new Emitter<Experiment>();
    public static widgetActivatedSignal = TraceViewerWidget.widgetActivatedEmitter.event;

    constructor(
        @inject(TraceViewerWidgetOptions) protected readonly options: TraceViewerWidgetOptions,
        @inject(TraceManager) private traceManager: TraceManager,
        @inject(ExperimentManager) private experimentManager: ExperimentManager,
        @inject(TspClientProvider) private tspClientProvider: TspClientProvider,
        @inject(StatusBar) private statusBar: StatusBar,
        @inject(FileSystem) private readonly fileSystem: FileSystem,
        @inject(ApplicationShell) protected readonly shell: ApplicationShell
    ) {
        super();
        this.uri = new Path(this.options.traceURI);
        this.id = 'theia-traceOpen';
        this.title.label = 'Trace: ' + this.uri.base;
        this.title.closable = true;
        this.addClass('theia-trace-open');
        this.toDispose.push(TraceExplorerWidget.outputAddedSignal(output => this.onOutputAdded(output)));
        this.toDispose.push(TraceExplorerWidget.experimentSelectedSignal(experiment => this.onExperimentSelected(experiment)));

        this.initialize();
        this.tspClient = this.tspClientProvider.getTspClient();
        this.tspClientProvider.addTspClientChangeListener(tspClient => this.tspClient = tspClient);
    }

    async initialize(): Promise<void> {

        /*
         * TODO: use backend service to find traces
         */
        const tracesArray = new Array<Path>();
        const fileStat = await this.fileSystem.getFileStat(this.uri.toString());
        if (fileStat) {
            if (fileStat.isDirectory) {
                // Find recursivly CTF traces
                await this.findTraces(fileStat, tracesArray);
            } else {
                // Open single trace file
                tracesArray.push(this.uri);
            }
        }

        const traces = new Array<Trace>();

        for (let i = 0; i < tracesArray.length; i++) {
            const trace = await this.traceManager.openTrace(tracesArray[i], tracesArray[i].name);
            if (trace) {
                traces.push(trace);
            }
        }

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
    }

    onCloseRequest(msg: Message): void {
        if (this.openedExperiment) {

            const traces = this.openedExperiment.traces;
            // Close experiment
            this.experimentManager.closeExperiment(this.openedExperiment.UUID);

            /*
             TODO:
             Decide wheather to delete traces from server as well.
             Other experiments might wan to be create with these traces.
            */
            // Close each trace
            for (let i = 0; i < traces.length; i++) {
                this.traceManager.closeTrace(traces[i].UUID);
            }
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
                statusBar={this.statusBar}
                addResizeHandler={this.addResizeHandler} /> : 'Trace is loading...'}
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
    private async findTraces(rootStat: FileStat | undefined, traces: Array<Path>) {
        /**
         * If single file selection then return single trace in traces, if directory then find
         * recoursivly CTF traces in starting from root directory.
         */
        if (rootStat) {
            if (rootStat.isDirectory) {
                    const isCtf = this.isCtf(rootStat);
                if (isCtf) {
                    const uri = new URI(rootStat.uri);
                    traces.push(uri.path);
                } else {
                    if (rootStat.children) {
                        for (let i = 0; i < rootStat.children.length; i++) {
                            const fileStat = await this.fileSystem.getFileStat(rootStat.children[i].uri);
                            await this.findTraces(fileStat, traces);
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
