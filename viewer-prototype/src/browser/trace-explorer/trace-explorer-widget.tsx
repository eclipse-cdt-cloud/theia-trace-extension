import { injectable, inject } from 'inversify';
import { ReactWidget } from '@theia/core/lib/browser/widgets/react-widget';
import * as React from 'react';
import { TraceManager } from '../../common/trace-manager';
import { Trace } from 'tsp-typescript-client/lib/models/trace';
import { List, ListRowProps } from 'react-virtualized';
import { OutputDescriptor } from 'tsp-typescript-client/lib/models/output-descriptor';

export const TRACE_EXPLORER_ID = 'trace-explorer';
export const TRACE_EXPLORER_LABEL = 'Trace Explorer';

@injectable()
export class TraceExplorerWidget extends ReactWidget {
    private OPENED_TRACE_TITLE: string = 'Opened traces';
    private FILE_NAVIGATOR_TITLE: string = 'File navigator';
    private ANALYSIS_TITLE: string = 'Available analysis';

    private openedTraces: Array<Trace> = new Array();
    private availableOutputDescriptors: Array<OutputDescriptor> = new Array();

    constructor(
        @inject(TraceManager) private traceManager: TraceManager,
    ) {
        super();
        this.id = TRACE_EXPLORER_ID;
        this.title.label = TRACE_EXPLORER_LABEL;
        this.toDispose.push(traceManager.traceOpenedSignal(trace => this.onTraceOpened(trace)));
        this.toDispose.push(traceManager.traceClosedSignal(trace => this.onTraceClosed(trace)));
        this.initialize();
    }

    private onTraceOpened(openedTrace: Trace) {
        this.updateOpenedTraces();
        this.updateAvailableAnalysis(openedTrace);
    }

    private onTraceClosed(closedTrace: Trace) {
        this.updateOpenedTraces();
        this.updateAvailableAnalysis(undefined);
    }

    async initialize(): Promise<void> {
        this.updateOpenedTraces();
        this.updateAvailableAnalysis(undefined);
    }

    protected render(): React.ReactNode {
        this.updateOpenedTraces = this.updateOpenedTraces.bind(this);
        this.updateAvailableAnalysis = this.updateAvailableAnalysis.bind(this);
        this.traceRowRenderer = this.traceRowRenderer.bind(this);
        this.outputsRowRenderer = this.outputsRowRenderer.bind(this);
        return <div className='trace-explorer-container'>
            <div className='trace-explorer-opened'>
                <div className='trace-explorer-panel-title' onClick={this.updateOpenedTraces}>
                    {this.OPENED_TRACE_TITLE}
                </div>
                <div className='trace-explorer-panel-content'>
                    <List
                        height={300}
                        width={300}
                        rowCount={this.openedTraces.length}
                        rowHeight={50}
                        rowRenderer={this.traceRowRenderer}/>
                </div>
            </div>
            <div className='trace-explorer-files'>
                <div className='trace-explorer-panel-title'>
                    {this.FILE_NAVIGATOR_TITLE}
                </div>
                <div className='trace-explorer-panel-content'>
                    {'List of files'}
                </div>
            </div>
            <div className='trace-explorer-analysis'>
                <div className='trace-explorer-panel-title'>
                    {this.ANALYSIS_TITLE}
                </div>
                <div className='trace-explorer-panel-content'>
                    <List
                        height={300}
                        width={300}
                        rowCount={this.availableOutputDescriptors.length}
                        rowHeight={50}
                        rowRenderer={this.outputsRowRenderer} />
                </div>
            </div>
        </div>;
    }

    private traceRowRenderer(props: ListRowProps): React.ReactNode {
        let traceName = '';
        let tracePath = '';
        if (this.openedTraces && this.openedTraces.length && props.index < this.openedTraces.length) {
            traceName = this.openedTraces[props.index].name;
            tracePath = this.openedTraces[props.index].path;
        }
        return <div className='trace-list-container' key={props.key} style={props.style}>
            <div className='trace-list-name'>
                {traceName}
            </div>
            <div className='trace-list-path'>
                {tracePath}
            </div>
        </div>;
    }

    private outputsRowRenderer(props: ListRowProps): React.ReactNode {
        let outputName = '';
        let outputDescription = '';
        if (this.availableOutputDescriptors && this.availableOutputDescriptors.length && props.index < this.availableOutputDescriptors.length) {
            outputName = this.availableOutputDescriptors[props.index].name;
            outputDescription = this.availableOutputDescriptors[props.index].description;
        }
        return <div className='outputs-list-container' key={props.key} style={props.style}>
            <div className='outputs-list-name'>
                {outputName}
            </div>
            <div className='outputs-list-description'>
                {outputDescription}
            </div>
        </div>;
    }

    private async updateOpenedTraces() {
        this.openedTraces = this.traceManager.getOpenTraces();
        this.update();
    }

    private async updateAvailableAnalysis(trace: Trace | undefined) {
        this.availableOutputDescriptors = new Array();
        if (trace) {
            this.availableOutputDescriptors = await this.getOutputDescriptors(trace);
        } else {
            if (this.openedTraces.length) {
                this.availableOutputDescriptors = await this.getOutputDescriptors(this.openedTraces[0]);
            }
        }

        this.update();
    }

    private async getOutputDescriptors(trace: Trace): Promise<OutputDescriptor[]> {
        const outputDescriptors: OutputDescriptor[] = new Array();
        const descriptors = await this.traceManager.getAvailableOutputs(trace.name);
        if (descriptors && descriptors.length) {
            outputDescriptors.push(...descriptors);
        }
        return outputDescriptors;
    }
}