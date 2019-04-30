import { StatusBar, StatusBarAlignment } from '@theia/core/lib/browser';
import * as React from 'react';
import { Layout, Responsive, WidthProvider } from 'react-grid-layout';
import { TimelineChart } from 'timeline-chart/lib/time-graph-model';
import { TimeGraphUnitController } from 'timeline-chart/lib/time-graph-unit-controller';
import { OutputDescriptor } from 'tsp-typescript-client/lib/models/output-descriptor';
import { Trace } from 'tsp-typescript-client/lib/models/trace';
import { TspClient } from 'tsp-typescript-client/lib/protocol/tsp-client';
import { TimeRange } from '../../../common/utils/time-range';
import { AbstractOutputProps } from './abstract-output-component';
import { TableOutputComponent } from './table-output-component';
import { TimegraphOutputComponent } from './timegraph-output-component';
import { OutputComponentStyle } from './utils/output-component-style';
import { TimeAxisComponent } from './utils/time-axis-component';
import { TimeNavigatorComponent } from './utils/time-navigator-component';
import { XYOutputComponent } from './xy-output-component';

const ResponsiveGridLayout = WidthProvider(Responsive);

type TraceContextProps = {
    tspClient: TspClient;
    trace: Trace;
    outputs: OutputDescriptor[];
    onOutputRemove: (outputId: string) => void;
    // Introduce dependency on Theia maybe it should be just a callback
    statusBar: StatusBar;
    addResizeHandler: (handler: () => void) => void;
}

type TraceContextState = {
    timeOffset: number;
    currentRange: TimeRange;
    currentViewRange: TimeRange;
    currentTimeSelection: TimeRange | undefined;
    trace: Trace
    traceIndexing: boolean;
    style: OutputComponentStyle;
}

export class TraceContextComponent extends React.Component<TraceContextProps, TraceContextState> {
    private readonly INDEXING_RUNNING_STATUS: string = 'RUNNING';
    private readonly INDEXING_STATUS_BAR_KEY = 'indexing-status';
    private readonly TIME_SELECTION_STATUS_BAR_KEY = 'time-selection-range';
    private readonly COMPONENT_WIDTH_PROPORTION: number = 0.85;
    private readonly DEFAULT_COMPONENT_WIDTH: number = 1500;
    private readonly DEFAULT_CHART_WIDTH: number = Math.floor(this.DEFAULT_COMPONENT_WIDTH * this.COMPONENT_WIDTH_PROPORTION);
    private readonly DEFAULT_COMPONENT_HEIGHT: number = 300;
    private readonly SCROLLBAR_PADDING: number = 12;

    private unitController: TimeGraphUnitController;

    private traceContextContainer: React.RefObject<HTMLDivElement>;

    protected widgetResizeHandlers: (() => void)[] = [];
    protected readonly addWidgetResizeHandler = (h: () => void) => {
        this.widgetResizeHandlers.push(h);
    }

    constructor(props: TraceContextProps) {
        super(props);
        let traceRange = new TimeRange(0, 0);
        let viewRange = new TimeRange(0, 0);
        if (this.props.trace) {
            const trace = this.props.trace;
            traceRange = new TimeRange(trace.start - this.props.trace.start, trace.end - this.props.trace.start, this.props.trace.start);
            viewRange = new TimeRange(trace.start - this.props.trace.start, trace.end - this.props.trace.start, this.props.trace.start);
        }
        this.state = {
            timeOffset: this.props.trace.start,
            currentRange: traceRange,
            currentViewRange: viewRange,
            currentTimeSelection: undefined,
            trace: this.props.trace,
            traceIndexing: this.props.trace.indexingStatus === this.INDEXING_RUNNING_STATUS,
            style: {
                width: this.DEFAULT_COMPONENT_WIDTH, // 1245,
                chartWidth: this.DEFAULT_CHART_WIDTH,
                height: this.DEFAULT_COMPONENT_HEIGHT,
                naviBackgroundColor: 0x3f3f3f,
                chartBackgroundColor: 0x3f3f3f,
                cursorColor: 0x259fd8,
                lineColor: 0xbbbbbb,
                rowHeight: 20
            }
        };
        const absoluteRange = traceRange.getDuration();
        this.unitController = new TimeGraphUnitController(absoluteRange, { start: 0, end: absoluteRange });
        this.unitController.numberTranslator = (theNumber: number) => {
            const originalStart = traceRange.getstart();
            theNumber += originalStart;
            const milli = Math.floor(theNumber / 1000000);
            const micro = Math.floor((theNumber % 1000000) / 1000);
            const nano = Math.floor((theNumber % 1000000) % 1000);
            return milli + ':' + micro + ':' + nano; // THAT IS TOO LONG, need to find better format
        };
        this.unitController.onSelectionRangeChange(range => { this.handleTimeSelectionChange(range) });
        this.unitController.onViewRangeChanged(viewRange => { this.handleViewRangeChange(viewRange) });
        this.traceContextContainer = React.createRef();
        this.initialize();
    }

    private async initialize() {
        await this.updateTrace();
        this.unitController.absoluteRange = this.state.trace.end - this.state.timeOffset;
        this.unitController.viewRange = { start: 0, end: this.state.trace.end - this.state.timeOffset };
    }

    private async updateTrace() {
        if (this.state.traceIndexing) {
            let updatedTrace = (await this.props.tspClient.fetchTrace(this.props.trace.UUID)).getModel();
            let isIndexing = updatedTrace.indexingStatus === this.INDEXING_RUNNING_STATUS;
            while (isIndexing) {
                updatedTrace = (await this.props.tspClient.fetchTrace(this.props.trace.UUID)).getModel();
                isIndexing = updatedTrace.indexingStatus === this.INDEXING_RUNNING_STATUS;
                this.setState({
                    timeOffset: updatedTrace.start,
                    trace: updatedTrace,
                    traceIndexing: isIndexing,
                    currentRange: new TimeRange(updatedTrace.start - updatedTrace.start, updatedTrace.end - updatedTrace.start, updatedTrace.start)
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
        this.onResize = this.onResize.bind(this)
        this.props.addResizeHandler(this.onResize);
        this.onResize();
    }

    componentWillUnmount() {
        this.props.statusBar.removeElement(this.INDEXING_STATUS_BAR_KEY);
        this.props.statusBar.removeElement(this.TIME_SELECTION_STATUS_BAR_KEY);
    }

    private onResize() {
        const newWidth = this.traceContextContainer.current ? this.traceContextContainer.current.clientWidth - this.SCROLLBAR_PADDING : this.DEFAULT_COMPONENT_WIDTH;
        this.setState(prevState => {
            return { style: { ...prevState.style, width: newWidth, chartWidth: this.getChartWidth(newWidth) } };
        });
        this.widgetResizeHandlers.forEach(h => h());
    }

    private getChartWidth(totalWidth: number): number {
        return Math.floor(totalWidth * this.COMPONENT_WIDTH_PROPORTION);
    }

    private handleTimeSelectionChange(range: TimelineChart.TimeGraphRange) {
        const t1 = Math.trunc(range.start + this.state.timeOffset);
        const t2 = Math.trunc(range.end + this.state.timeOffset);

        this.props.statusBar.setElement(this.TIME_SELECTION_STATUS_BAR_KEY, {
            text: `T1: ${t1} T2: ${t2} Delta: ${t2 - t1}`,
            alignment: StatusBarAlignment.LEFT,
        });
        this.setState(prevState => {
            return {
                currentTimeSelection: new TimeRange(range.start, range.end, prevState.timeOffset)
            };
        });
    }

    private handleViewRangeChange(viewRange: TimelineChart.TimeGraphRange) {
        this.setState(prevState => {
            return {
                currentViewRange: new TimeRange(viewRange.start, viewRange.end, prevState.timeOffset)
            };
        });
    }

    render() {
        return <div className='trace-context-container' ref={this.traceContextContainer}>
            {this.props.outputs.length ? this.renderOutputs() : this.renderPlaceHolder()}
        </div>
    }

    private renderOutputs() {
        const layouts = this.generateGridLayout();
        const outputs = this.props.outputs;
        return <React.Fragment>
            <div style={{ marginLeft: this.state.style.width - this.state.style.chartWidth }}>
                <TimeAxisComponent unitController={this.unitController} style={this.state.style} addWidgetResizeHandler={this.addWidgetResizeHandler} />
            </div>
            <ResponsiveGridLayout className='outputs-grid-layout' margin={[0, 5]} isResizable={false}
                layouts={{ lg: layouts }} cols={{ lg: 1 }} breakpoints={{ lg: 1200 }} rowHeight={300} draggableHandle={'.widget-handle'}
                style={{ paddingRight: this.SCROLLBAR_PADDING }}>
                {outputs.map(output => {
                    const responseType = output.type;
                    const outputProps: AbstractOutputProps = {
                        tspClient: this.props.tspClient,
                        traceId: this.state.trace.UUID,
                        outputDescriptor: output,
                        range: this.state.currentRange,
                        viewRange: this.state.currentViewRange,
                        selectionRange: this.state.currentTimeSelection,
                        style: this.state.style,
                        onOutputRemove: this.props.onOutputRemove,
                        unitController: this.unitController
                    };
                    switch (responseType) {
                        case 'TIME_GRAPH':
                            return <div key={output.id}>
                                <TimegraphOutputComponent key={output.id} {...outputProps}
                                    addWidgetResizeHandler={this.addWidgetResizeHandler} />
                            </div>;
                        case 'TREE_TIME_XY':
                            return <div key={output.id}>
                                <XYOutputComponent key={output.id} {...outputProps} />
                            </div>;
                        case 'TABLE':
                            return <div key={output.id}>
                                <TableOutputComponent key={output.id} {...outputProps} />
                            </div>;
                        default:
                            break;
                    }
                })}
            </ResponsiveGridLayout>
            <div style={{ marginLeft: this.state.style.width - this.state.style.chartWidth }}>
                <TimeNavigatorComponent unitController={this.unitController} style={this.state.style} addWidgetResizeHandler={this.addWidgetResizeHandler} />
            </div>
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
                    i: output.id,
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
