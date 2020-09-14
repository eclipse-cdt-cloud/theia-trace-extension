import * as React from 'react';
import '../style/trace-viewer.css';
import '../style/trace-context-style.css';
import '../style/output-components-style.css';
import '../style/trace-explorer.css';
import '../style/status-bar.css';
import { Layout, Responsive, WidthProvider } from 'react-grid-layout';
import { TimelineChart } from 'timeline-chart/lib/time-graph-model';
import { TimeGraphUnitController } from 'timeline-chart/lib/time-graph-unit-controller';
import { OutputDescriptor } from 'tsp-typescript-client/lib/models/output-descriptor';
import { Experiment } from 'tsp-typescript-client/lib/models/experiment';
import { TspClient } from 'tsp-typescript-client/lib/protocol/tsp-client';
import { TimeRange } from '@tracecompass/base/lib/utils/time-range';
import { AbstractOutputProps } from './abstract-output-component';
import { TableOutputComponent } from './table-output-component';
import { TimegraphOutputComponent } from './timegraph-output-component';
import { OutputComponentStyle } from './utils/output-component-style';
import { TimeAxisComponent } from './utils/time-axis-component';
import { TimeNavigatorComponent } from './utils/time-navigator-component';
import { XYOutputComponent } from './xy-output-component';
import * as Messages from '@tracecompass/base/lib/message-manager';

const ResponsiveGridLayout = WidthProvider(Responsive);

interface TraceContextProps {
    tspClient: TspClient;
    experiment: Experiment;
    outputs: OutputDescriptor[];
    onOutputRemove: (outputId: string) => void;
    // Introduce dependency on Theia maybe it should be just a callback
    messageManager: Messages.MessageManager;
   // addResizeHandler: (handler: () => void) => void;
}

interface TraceContextState {
    timeOffset: number;
    currentRange: TimeRange;
    currentViewRange: TimeRange;
    currentTimeSelection: TimeRange | undefined;
    experiment: Experiment
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
    private readonly DEFAULT_COMPONENT_HEIGHT: number = 10;
    private readonly DEFAULT_COMPONENT_ROWHEIGHT: number = 20;
    private readonly SCROLLBAR_PADDING: number = 12;

    private unitController: TimeGraphUnitController;

    private traceContextContainer: React.RefObject<HTMLDivElement>;

    protected widgetResizeHandlers: (() => void)[] = [];
    protected readonly addWidgetResizeHandler = (h: () => void): void => {
        this.widgetResizeHandlers.push(h);
    };

    constructor(props: TraceContextProps) {
        super(props);
        let traceRange = new TimeRange(0, 0);
        let viewRange = new TimeRange(0, 0);
        if (this.props.experiment) {
            const experiment = this.props.experiment;
            traceRange = new TimeRange(experiment.start - this.props.experiment.start, experiment.end - this.props.experiment.start, this.props.experiment.start);
            viewRange = new TimeRange(experiment.start - this.props.experiment.start, experiment.end - this.props.experiment.start, this.props.experiment.start);
        }
        this.state = {
            timeOffset: this.props.experiment.start,
            currentRange: traceRange,
            currentViewRange: viewRange,
            currentTimeSelection: undefined,
            experiment: this.props.experiment,
            traceIndexing: this.props.experiment.indexingStatus === this.INDEXING_RUNNING_STATUS,
            style: {
                width: this.DEFAULT_COMPONENT_WIDTH, // 1245,
                chartWidth: this.DEFAULT_CHART_WIDTH,
                height: this.DEFAULT_COMPONENT_HEIGHT,
                rowHeight: this.DEFAULT_COMPONENT_ROWHEIGHT,
                naviBackgroundColor: 0x3f3f3f,
                chartBackgroundColor: 0x3f3f3f,
                cursorColor: 0x259fd8,
                lineColor: 0xbbbbbb
            }
        };
        const absoluteRange = traceRange.getDuration();
        this.unitController = new TimeGraphUnitController(absoluteRange, { start: 0, end: absoluteRange });
        this.unitController.numberTranslator = (theNumber: number) => {
            const originalStart = traceRange.getstart();
            theNumber += originalStart;
            const zeroPad = (num: number) => String(num).padStart(3, '0');
            const seconds = Math.floor(theNumber / 1000000000);
            const millis = zeroPad(Math.floor(theNumber / 1000000) % 1000);
            const micros = zeroPad(Math.floor(theNumber / 1000) % 1000);
            const nanos = zeroPad(Math.floor(theNumber) % 1000);
            return seconds + '.' + millis + ' ' + micros + ' ' + nanos;
        };
        this.unitController.onSelectionRangeChange(range => { this.handleTimeSelectionChange(range); });
        this.unitController.onViewRangeChanged(viewRangeParam => { this.handleViewRangeChange(viewRangeParam); });
        this.traceContextContainer = React.createRef();
        this.initialize();
    }

    private async initialize() {
        await this.updateTrace();
        this.unitController.absoluteRange = this.state.experiment.end - this.state.timeOffset;
        this.unitController.viewRange = { start: 0, end: this.state.experiment.end - this.state.timeOffset };
    }

    private async updateTrace() {
        if (this.state.traceIndexing) {
            let updatedExperiment = (await this.props.tspClient.fetchExperiment(this.props.experiment.UUID)).getModel();
            let isIndexing = updatedExperiment.indexingStatus === this.INDEXING_RUNNING_STATUS;
            while (isIndexing) {
                updatedExperiment = (await this.props.tspClient.fetchExperiment(this.props.experiment.UUID)).getModel();
                isIndexing = updatedExperiment.indexingStatus === this.INDEXING_RUNNING_STATUS;
                this.setState({
                    timeOffset: updatedExperiment.start,
                    experiment: updatedExperiment,
                    traceIndexing: isIndexing,
                    currentRange: new TimeRange(updatedExperiment.start - updatedExperiment.start, updatedExperiment.end - updatedExperiment.start, updatedExperiment.start)
                });

                // Update status bar
                console.log("will add status");
                this.props.messageManager.addStatusMessage(this.INDEXING_STATUS_BAR_KEY, {
                    text: `Indexing ${this.props.experiment.name}: ${this.state.experiment.nbEvents}`,
                    category: Messages.MessageCategory.SERVER_MESSAGE
                }); 
                await this.sleep(500);
            }
        }
        this.props.messageManager.removeStatusMessage(this.INDEXING_STATUS_BAR_KEY);
    }

    private async sleep(ms: number) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    componentDidMount(): void {
        this.onResize = this.onResize.bind(this);
        //this.props.addResizeHandler(this.onResize);
        this.onResize();
    }

    componentWillUnmount(): void {
        this.props.messageManager.removeStatusMessage(this.INDEXING_STATUS_BAR_KEY);
        this.props.messageManager.removeStatusMessage(this.TIME_SELECTION_STATUS_BAR_KEY);
    }

    private onResize() {
        const newWidth = this.traceContextContainer.current ? this.traceContextContainer.current.clientWidth - this.SCROLLBAR_PADDING : this.DEFAULT_COMPONENT_WIDTH;
        this.setState(prevState => ({ style: { ...prevState.style, width: newWidth, chartWidth: this.getChartWidth(newWidth) } }));
        this.widgetResizeHandlers.forEach(h => h());
    }

    private getChartWidth(totalWidth: number): number {
        return Math.floor(totalWidth * this.COMPONENT_WIDTH_PROPORTION);
    }

    private handleTimeSelectionChange(range: TimelineChart.TimeGraphRange) {
        const t1 = Math.trunc(range.start + this.state.timeOffset);
        const t2 = Math.trunc(range.end + this.state.timeOffset);

        this.props.messageManager.addStatusMessage(this.TIME_SELECTION_STATUS_BAR_KEY, {
            text: `T1: ${t1} T2: ${t2} Delta: ${t2 - t1}`,
            category: Messages.MessageCategory.TRACE_CONTEXT
        }); 
        this.setState(prevState => ({
                currentTimeSelection: new TimeRange(range.start, range.end, prevState.timeOffset)
            }));
    }

    private handleViewRangeChange(viewRange: TimelineChart.TimeGraphRange) {
        this.setState(prevState => ({
                currentViewRange: new TimeRange(viewRange.start, viewRange.end, prevState.timeOffset)
            }));
    }

    render(): JSX.Element {
        return <div className='trace-context-container' ref={this.traceContextContainer}>
            {this.props.outputs.length ? this.renderOutputs() : this.renderPlaceHolder()}
        </div>;
    }

    private renderOutputs() {
        const layouts = this.generateGridLayout();
        const outputs = this.props.outputs;
        return <React.Fragment>
            <div style={{ marginLeft: this.state.style.width - this.state.style.chartWidth }}>
                <TimeAxisComponent unitController={this.unitController} style={this.state.style} addWidgetResizeHandler={this.addWidgetResizeHandler} />
            </div>
            {
            // Syntax to use ReactGridLayout with Custom Components, while passing resized dimensions to children:
            // https://github.com/STRML/react-grid-layout/issues/299#issuecomment-524959229
            }
            <ResponsiveGridLayout className='outputs-grid-layout' margin={[0, 5]} isResizable={true} isRearrangeable={true} isDraggable={true}
                layouts={{ lg: layouts }} cols={{ lg: 1 }} breakpoints={{ lg: 1200 }} rowHeight={this.DEFAULT_COMPONENT_ROWHEIGHT} draggableHandle={'.widget-handle'}
                style={{ paddingRight: this.SCROLLBAR_PADDING }}>
                {outputs.map(output => {
                    const responseType = output.type;
                    const outputProps: AbstractOutputProps = {
                        tspClient: this.props.tspClient,
                        traceId: this.state.experiment.UUID,
                        outputDescriptor: output,
                        range: this.state.currentRange,
                        viewRange: this.state.currentViewRange,
                        selectionRange: this.state.currentTimeSelection,
                        style: this.state.style,
                        onOutputRemove: this.props.onOutputRemove,
                        unitController: this.unitController,
                        widthWPBugWorkaround: this.state.style.width
                    };
                    switch (responseType) {
                        case 'TIME_GRAPH':
                            return <TimegraphOutputComponent key={output.id} {...outputProps}
                                    addWidgetResizeHandler={this.addWidgetResizeHandler} />;
                        case 'TREE_TIME_XY':
                            return <XYOutputComponent key={output.id} {...outputProps} />;
                        case 'TABLE':
                            return <TableOutputComponent key={output.id} {...outputProps} />;
                        default:
                            break;
                    }
                })}
            </ResponsiveGridLayout>
            <div style={{ marginLeft: this.state.style.width - this.state.style.chartWidth }}>
                <TimeNavigatorComponent unitController={this.unitController} style={this.state.style} addWidgetResizeHandler={this.addWidgetResizeHandler} />
            </div>
        </React.Fragment>;
    }

    private renderPlaceHolder() {
        return <div className='no-output-placeholder'>
            {'Add outputs by clicking on an analysis in the trace explorer view'}
        </div>;
    }

    private generateGridLayout(): Layout[] {
        const outputs = this.props.outputs;
        const layouts: Layout[] = [];
        if (outputs.length) {
            outputs.forEach((output, index) => {
                const itemLayout = {
                    i: output.id,
                    x: 0,
                    y: index,
                    w: 1,
                    h: this.DEFAULT_COMPONENT_HEIGHT
                };
                layouts.push(itemLayout);
            });
        }
        return layouts;
    }
}
