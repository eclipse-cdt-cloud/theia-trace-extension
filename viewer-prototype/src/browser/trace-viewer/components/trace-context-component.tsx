import * as React from 'react';
import { TimegraphOutputComponent } from './timegraph-output-component';
import { XYOutputComponent } from './xy-output-component';
import { TableOutputComponent } from './table-output-component';
import { Trace } from 'tsp-typescript-client/lib/models/trace';
import { connect } from 'react-redux';
import { addTrace } from '../redux/actions';
import { OutputDescriptor } from 'tsp-typescript-client/lib/models/output-descriptor';
import { WidthProvider, Responsive, Layout } from 'react-grid-layout';
import { TspClient } from 'tsp-typescript-client/lib/protocol/tsp-client';
import { AbstractOutputProps } from './abstract-output-component';
import { TimeAxisComponent } from './utils/time-axis-component';
import { TimeGraphUnitController } from 'timeline-chart/lib/time-graph-unit-controller';
import { TimelineChart } from 'timeline-chart/lib/time-graph-model';
import { StatusBar, StatusBarAlignment } from '@theia/core/lib/browser';

const ResponsiveGridLayout = WidthProvider(Responsive);

type TraceContextProps = {
    tspClient: TspClient;
    trace: Trace;
    outputs: OutputDescriptor[];
    onOutputRemove: (outputId: string) => void;
    // Introduce dependency on Theia maybe it should be just a callback
    statusBar: StatusBar;
}

type TraceContextState = {
    currentRange: number[];
    currentViewRange: number[];
    currentTimeSelection: number[];
    trace: Trace
    traceIndexing: boolean;
}

export class TraceContextComponent extends React.Component<TraceContextProps, TraceContextState> {
    private readonly INDEXING_RUNNING_STATUS: string = 'RUNNING';
    private readonly INDEXING_STATUS_BAR_KEY = 'indexing-status';
    private readonly TIME_SELECTION_STATUS_BAR_KEY = 'time-selection-range';

    private unitController: TimeGraphUnitController;
    private style: {
        mainWidth: number,
        mainHeight: number
        naviBackgroundColor: number,
        chartBackgroundColor: number,
        cursorColor: number,
        lineColor: number,
        rowHeight: number
    };

    protected widgetResizeHandlers: (() => void)[] = [];
    protected readonly addWidgetResizeHandler = (h: () => void) => {
        this.widgetResizeHandlers.push(h);
    }

    constructor(props: TraceContextProps) {
        super(props);
        let traceRange = [0, 0];
        let viewRange = [0, 0];
        if (this.props.trace) {
            const trace = this.props.trace;
            traceRange = [trace.start, trace.end];
            viewRange = [trace.start, trace.end];
        }
        this.state = {
            currentRange: traceRange,
            currentViewRange: viewRange,
            currentTimeSelection: [],
            trace: this.props.trace,
            traceIndexing: this.props.trace.indexingStatus === this.INDEXING_RUNNING_STATUS
        };
        const absoluteRange = traceRange[1] - traceRange[0];
        this.unitController = new TimeGraphUnitController(absoluteRange, { start: 0, end: absoluteRange });
        this.unitController.numberTranslator = (theNumber: number) => {
            const originalStart = traceRange[0];
            theNumber += originalStart;
            const milli = Math.floor(theNumber / 1000000);
            const micro = Math.floor((theNumber % 1000000) / 1000);
            const nano = Math.floor((theNumber % 1000000) % 1000);
            return milli + ':' + micro + ':' + nano; // THAT IS TOO LONG, need to find better format
        };
        this.unitController.onSelectionRangeChange(range => { this.handleTimeSelectionChange(range) });
        this.unitController.onViewRangeChanged(viewRange => { this.handleViewRangeChange(viewRange) });
        this.style = {
            mainWidth: 1245,
            mainHeight: 290,
            naviBackgroundColor: 0x3f3f3f,
            chartBackgroundColor: 0x3f3f3f,
            cursorColor: 0x259fd8,
            lineColor: 0xbbbbbb,
            rowHeight: 20
        };
        this.initialize();
    }

    private async initialize() {
        await this.updateTrace();
        this.unitController.absoluteRange = this.state.trace.end - this.state.trace.start;
        this.unitController.viewRange = { start: 0, end: this.state.trace.end - this.state.trace.start };
    }

    private async updateTrace() {
        if (this.state.traceIndexing) {
            let updatedTrace = await this.props.tspClient.fetchTrace(this.props.trace.UUID);
            let isIndexing = updatedTrace.indexingStatus === this.INDEXING_RUNNING_STATUS;
            while (isIndexing) {
                updatedTrace = await this.props.tspClient.fetchTrace(this.props.trace.UUID);
                isIndexing = updatedTrace.indexingStatus === this.INDEXING_RUNNING_STATUS;
                this.setState({
                    trace: updatedTrace,
                    traceIndexing: isIndexing
                });

                // Update status bar
                this.props.statusBar.setElement(this.INDEXING_STATUS_BAR_KEY, {
                    text: `Indexing ${this.props.trace.name}: ${this.state.trace.nbEvents}`,
                    alignment: StatusBarAlignment.RIGHT
                });
                await this.sleep(500);
            }
        }
        this.props.statusBar.removeElement(this.INDEXING_STATUS_BAR_KEY);
    }

    private sleep(ms: number) {
        new Promise(resolve => setTimeout(resolve, ms))
    }

    componentDidMount() {
        if (this.props.trace) {
            addTrace(this.props.trace)
        }
    }

    componentWillUnmount() {
        this.props.statusBar.removeElement(this.INDEXING_STATUS_BAR_KEY);
        this.props.statusBar.removeElement(this.TIME_SELECTION_STATUS_BAR_KEY);
    }

    private handleTimeSelectionChange(range: TimelineChart.TimeGraphRange) {
        this.props.statusBar.setElement(this.TIME_SELECTION_STATUS_BAR_KEY, {
            text: `T1: ${Math.round(range.start)} T2: ${Math.round(range.end)} Delta: ${Math.round(range.end - range.start)}`,
            alignment: StatusBarAlignment.LEFT,
        });
        this.setState({
            currentTimeSelection: [range.start, range.end]
        });
    }

    private handleViewRangeChange(viewRange: TimelineChart.TimeGraphRange) {
        this.setState({
            currentViewRange: [viewRange.start, viewRange.end]
        });
    }

    render() {
        return <div className='trace-context-container'>
            {/* {this.state.traceIndexing && <div>{'Indexing trace: ' + this.state.trace.nbEvents}</div>} */}
            {this.props.outputs.length ? this.renderOutputs() : this.renderPlaceHolder()}
        </div>
    }

    private renderOutputs() {
        const layouts = this.generateGridLayout();
        const outputs = this.props.outputs;
        return <React.Fragment>
            <TimeAxisComponent unitController={this.unitController} style={this.style} addWidgetResizeHandler={this.addWidgetResizeHandler} />
            <ResponsiveGridLayout className='outputs-grid-layout' margin={[0, 10]} isResizable={false}
                layouts={{ lg: layouts }} cols={{ lg: 1 }} breakpoints={{ lg: 1200 }} rowHeight={300} draggableHandle={'.widget-handle'}>
                {outputs.map(output => {
                    const responseType = (output as any).type;
                    const outputProps: AbstractOutputProps = {
                        tspClient: this.props.tspClient,
                        traceId: this.state.trace.UUID,
                        outputDescriptor: output,
                        range: this.state.currentRange,
                        viewRange: this.state.currentViewRange,
                        onOutputRemove: this.props.onOutputRemove,
                        unitController: this.unitController
                    };
                    switch (responseType) {
                        case 'TIME_GRAPH':
                            return <div key={(output as any).id}>
                                <TimegraphOutputComponent key={(output as any).id} {...outputProps}
                                    addWidgetResizeHandler={this.addWidgetResizeHandler} style={this.style} />
                            </div>;
                        case 'TREE_TIME_XY':
                            return <div key={(output as any).id}>
                                <XYOutputComponent key={(output as any).id} {...outputProps} />
                            </div>;
                        case 'TABLE':
                            return <div key={(output as any).id}>
                                <TableOutputComponent key={(output as any).id} {...outputProps} />
                            </div>;
                        default:
                            break;
                    }
                })}
            </ResponsiveGridLayout>
        </React.Fragment>
    }

    private renderPlaceHolder() {
        return <div className='no-output-placeholder'>
            {'Add outputs by clicking on an analysis in the trace explorer view'}
        </div>;
    }

    private generateGridLayout(): Layout[] {
        const outputs = this.props.outputs;
        let layouts: Layout[] = [];
        if (outputs.length) {
            outputs.forEach((output, index) => {
                const itemLayout = {
                    i: (output as any).id,
                    x: 0,
                    y: index,
                    w: 1,
                    h: 1
                };
                layouts.push(itemLayout);
            });
        }
        return layouts;
    }
}

export default connect(
    null,
    { addTrace }
)(TraceContextComponent);
