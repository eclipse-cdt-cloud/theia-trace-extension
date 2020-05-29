import { Path } from '@theia/core';
import { FileSystem, FileStat } from '@theia/filesystem/lib/common/filesystem';
import { Message, StatusBar } from '@theia/core/lib/browser';
import { ReactWidget } from '@theia/core/lib/browser/widgets/react-widget';
import { inject, injectable } from 'inversify';
import * as React from 'react';
import { OutputDescriptor } from 'tsp-typescript-client/lib/models/output-descriptor';
import { Trace } from 'tsp-typescript-client/lib/models/trace';
import { TspClient } from 'tsp-typescript-client/lib/protocol/tsp-client';
import { TraceManager } from '../../common/trace-manager';
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

    private resizeHandlers: (() => void)[] = [];
    private readonly addResizeHandler = (h: () => void) => {
        this.resizeHandlers.push(h);
    }

    constructor(
        @inject(TraceViewerWidgetOptions) protected readonly options: TraceViewerWidgetOptions,
        @inject(TraceManager) private traceManager: TraceManager,
        @inject(ExperimentManager) private experimentManager: ExperimentManager,
        @inject(TspClient) private tspClient: TspClient,
        @inject(StatusBar) private statusBar: StatusBar,
        @inject(FileSystem) private readonly fileSystem: FileSystem,
    ) {
        super();
        this.uri = new Path(this.options.traceURI);
        this.id = 'theia-traceOpen';
        this.title.label = 'Trace: ' + this.uri.base;
        this.title.closable = true;
        this.addClass('theia-trace-open');
        this.toDispose.push(TraceExplorerWidget.outputAddedSignal(output => this.onOutputAdded(output)));
        this.initialize();
    }

    async initialize(): Promise<void> {

        /*
         * TODO: use backend service to find traces
         */
        let tracesArray = new Array<Path>();
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

        let traces = new Array<Trace>();

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
        }

        this.update();
    }

    onCloseRequest(msg: Message) {
        if (this.openedExperiment) {

            let traces = this.openedExperiment.traces;
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

    protected onResize() {
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
            const exist = this.outputDescriptors.find(output => { return output.id === payload.getOutputDescriptor().id });
            if (!exist) {
                this.outputDescriptors.push(payload.getOutputDescriptor());
                this.update();
            }
        }
    }

    private onOutputRemoved(outputId: string) {
        const outputToKeep = this.outputDescriptors.filter(output => {
            return output.id !== outputId;
        });
        this.outputDescriptors = outputToKeep;
        this.update();
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
                    let isCtf = this.isCtf(rootStat);
                if (isCtf) {
                    let uri = new URI(rootStat.uri);
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
    private isCtf(stat: FileStat): Boolean {
        if (stat.children) {
            for (let i = 0; i < stat.children.length; i++) {
                let path = new Path(stat.children[i].uri);
                if (path.name === "metadata") {
                    return true;
                }
            }
        }
        return false;
    }
}
