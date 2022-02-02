import * as React from 'react';
import '../../style/trace-viewer.css';
import '../../style/trace-context-style.css';
import '../../style/output-components-style.css';
import '../../style/trace-explorer.css';
import '../../style/status-bar.css';
import { Layout, Responsive, WidthProvider } from 'react-grid-layout';
import { TimelineChart } from 'timeline-chart/lib/time-graph-model';
import { TimeGraphUnitController } from 'timeline-chart/lib/time-graph-unit-controller';
import { OutputDescriptor } from 'tsp-typescript-client/lib/models/output-descriptor';
import { Experiment } from 'tsp-typescript-client/lib/models/experiment';
import { TspClient } from 'tsp-typescript-client/lib/protocol/tsp-client';
import { TimeRange } from 'traceviewer-base/lib/utils/time-range';
import { TableOutputComponent } from './table-output-component';
import { TimegraphOutputComponent } from './timegraph-output-component';
import { OutputComponentStyle } from './utils/output-component-style';
import { TimeAxisComponent } from './utils/time-axis-component';
import { TimeNavigatorComponent } from './utils/time-navigator-component';
import { XYOutputComponent } from './xy-output-component';
import { NullOutputComponent } from './null-output-component';
import { AbstractOutputProps } from './abstract-output-component';
import * as Messages from 'traceviewer-base/lib/message-manager';
import { signalManager, Signals } from 'traceviewer-base/lib/signals/signal-manager';
import ReactTooltip from 'react-tooltip';
import { TooltipComponent } from './tooltip-component';
import { TooltipXYComponent } from './tooltip-xy-component';
import { BIMath } from 'timeline-chart/lib/bigint-utils';
import { DataTreeOutputComponent } from './datatree-output-component';

const ResponsiveGridLayout = WidthProvider(Responsive);

interface TraceContextProps {
    tspClient: TspClient;
    experiment: Experiment;
    outputs: OutputDescriptor[];
    markerCategoriesMap: Map<string, string[]>;
    markerSetId: string;
    onOutputRemove: (outputId: string) => void;
    // Introduce dependency on Theia maybe it should be just a callback
    messageManager: Messages.MessageManager;
    addResizeHandler: (handler: () => void) => void;
    removeResizeHandler: (handler: () => void) => void;
    backgroundTheme: string;
}

interface TraceContextState {
    timeOffset: bigint;
    currentRange: TimeRange;
    currentViewRange: TimeRange;
    currentTimeSelection: TimeRange | undefined;
    experiment: Experiment
    traceIndexing: boolean;
    style: OutputComponentStyle;
    backgroundTheme: string;
}

export class TraceContextComponent extends React.Component<TraceContextProps, TraceContextState> {
    private readonly INDEXING_RUNNING_STATUS: string = 'RUNNING';
    private readonly INDEXING_CLOSED_STATUS: string = 'CLOSED';
    private readonly INDEXING_STATUS_BAR_KEY = 'indexing-status';
    private readonly TIME_SELECTION_STATUS_BAR_KEY = 'time-selection-range';
    private readonly DEFAULT_COMPONENT_HEIGHT: number = 10;
    private readonly DEFAULT_COMPONENT_ROWHEIGHT: number = 20;
    private readonly DEFAULT_COMPONENT_LEFT: number = 0;
    private readonly SCROLLBAR_PADDING: number = 12;
    private readonly DEFAULT_CHART_OFFSET = 200;

    private unitController: TimeGraphUnitController;
    private tooltipComponent: React.RefObject<TooltipComponent>;
    private tooltipXYComponent: React.RefObject<TooltipXYComponent>;
    private traceContextContainer: React.RefObject<HTMLDivElement>;

    protected widgetResizeHandlers: (() => void)[] = [];
    protected readonly addWidgetResizeHandler = (h: () => void): void => {
        this.widgetResizeHandlers.push(h);
    };

    protected readonly removeWidgetResizeHandler = (h: () => void): void => {
        const index = this.widgetResizeHandlers.indexOf(h, 0);
        if (index > -1) {
            this.widgetResizeHandlers.splice(index, 1);
        }
    };

    private onBackgroundThemeChange = (theme: string): void => this.doHandleBackgroundThemeChange(theme);
    private onUpdateZoom = (hasZoomedIn: boolean) => this.doHandleUpdateZoomSignal(hasZoomedIn);
    private onResetZoom = () => this.doHandleResetZoomSignal();

    constructor(props: TraceContextProps) {
        super(props);
        let traceRange = new TimeRange(BigInt(0), BigInt(0));
        let viewRange = new TimeRange(BigInt(0), BigInt(0));
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
            traceIndexing: ((this.props.experiment.indexingStatus === this.INDEXING_RUNNING_STATUS) || (this.props.experiment.indexingStatus === this.INDEXING_CLOSED_STATUS)),
            style: {
                width: 0, // width will be set by resize handler
                chartOffset: this.DEFAULT_CHART_OFFSET,
                componentLeft: this.DEFAULT_COMPONENT_LEFT,
                height: this.DEFAULT_COMPONENT_HEIGHT,
                rowHeight: this.DEFAULT_COMPONENT_ROWHEIGHT,
                naviBackgroundColor: this.props.backgroundTheme === 'light' ? 0xf4f7fb : 0x3f3f3f,
                chartBackgroundColor: this.props.backgroundTheme === 'light' ? 0xf4f7fb : 0x232323,
                cursorColor: 0x259fd8,
                lineColor: this.props.backgroundTheme === 'light' ? 0x757575 : 0xbbbbbb
            },
            backgroundTheme: this.props.backgroundTheme
        };
        const absoluteRange = traceRange.getDuration();
        this.unitController = new TimeGraphUnitController(absoluteRange, { start: BigInt(0), end: absoluteRange });
        this.unitController.numberTranslator = (theNumber: bigint) => {
            const originalStart = this.state.currentRange.getStart();
            theNumber += originalStart;
            const zeroPad = (num: bigint) => String(num).padStart(3, '0');
            const seconds = theNumber / BigInt(1000000000);
            const millis = zeroPad((theNumber / BigInt(1000000)) % BigInt(1000));
            const micros = zeroPad((theNumber / BigInt(1000)) % BigInt(1000));
            const nanos = zeroPad(theNumber % BigInt(1000));
            return seconds + '.' + millis + ' ' + micros + ' ' + nanos;
        };
        this.unitController.onSelectionRangeChange(range => { this.handleTimeSelectionChange(range); });
        this.unitController.onViewRangeChanged(viewRangeParam => { this.handleViewRangeChange(viewRangeParam); });
        this.tooltipComponent = React.createRef();
        this.tooltipXYComponent = React.createRef();
        this.traceContextContainer = React.createRef();
        this.onResize = this.onResize.bind(this);
        this.setChartOffset = this.setChartOffset.bind(this);
        this.props.addResizeHandler(this.onResize);
        this.initialize();
        this.subscribeToEvents();
    }

    private doHandleBackgroundThemeChange(theme: string): void {
        this.setState(prevState => ({
            style: {
                ...prevState.style,
                naviBackgroundColor: theme === 'light' ? 0xf4f7fb : 0x3f3f3f,
                chartBackgroundColor: theme === 'light' ? 0xf4f7fb : 0x232323,
                lineColor: theme === 'light' ? 0x757575 : 0xbbbbbb
            },
            backgroundTheme: theme
        }));
    }

    private async initialize() {
        await this.updateTrace();
        this.unitController.absoluteRange = this.state.experiment.end - this.state.timeOffset;
        this.unitController.viewRange = { start: BigInt(0), end: this.state.experiment.end - this.state.timeOffset };
        this.unitController.offset = this.state.timeOffset;
    }

    private async updateTrace() {
        if (this.state.traceIndexing) {
            let isIndexing = true;
            while (isIndexing) {
                const tspClientResponse = await this.props.tspClient.fetchExperiment(this.props.experiment.UUID);
                const updatedExperiment = tspClientResponse.getModel();
                if (tspClientResponse.isOk() && updatedExperiment) {
                    isIndexing = updatedExperiment.indexingStatus === this.INDEXING_RUNNING_STATUS;
                    this.setState({
                        timeOffset: updatedExperiment.start,
                        experiment: updatedExperiment,
                        traceIndexing: isIndexing,
                        currentRange: new TimeRange(updatedExperiment.start - updatedExperiment.start, updatedExperiment.end - updatedExperiment.start, updatedExperiment.start)
                    });

                    // Update status bar
                    this.props.messageManager.addStatusMessage(this.INDEXING_STATUS_BAR_KEY, {
                        text: `Indexing ${this.props.experiment.name}: ${this.state.experiment.nbEvents}`,
                        category: Messages.MessageCategory.SERVER_MESSAGE
                    });
                    await this.sleep(500);
                } else {
                    break;
                }
            }
        }
        this.props.messageManager.removeStatusMessage(this.INDEXING_STATUS_BAR_KEY);
    }

    private async sleep(ms: number) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    componentDidMount(): void {
        this.onResize();
    }

    componentWillUnmount(): void {
        this.props.messageManager.removeStatusMessage(this.INDEXING_STATUS_BAR_KEY);
        this.props.messageManager.removeStatusMessage(this.TIME_SELECTION_STATUS_BAR_KEY);
        this.props.removeResizeHandler(this.onResize);
        this.unsubscribeToEvents();
    }

    private subscribeToEvents() {
        signalManager().on(Signals.THEME_CHANGED, this.onBackgroundThemeChange);
        signalManager().on(Signals.UPDATE_ZOOM, this.onUpdateZoom);
        signalManager().on(Signals.RESET_ZOOM, this.onResetZoom);
    }

    private unsubscribeToEvents() {
        signalManager().off(Signals.THEME_CHANGED, this.onBackgroundThemeChange);
        signalManager().off(Signals.UPDATE_ZOOM, this.onUpdateZoom);
        signalManager().off(Signals.RESET_ZOOM, this.onResetZoom);
    }

    async componentDidUpdate(prevProps: TraceContextProps): Promise<void> {
        // Rebuild enables tooltip on newly added output component
        ReactTooltip.rebuild();
        if (prevProps.outputs.length < this.props.outputs.length) {
            this.scrollToBottom();
        }
    }

    private scrollToBottom(): void {
        if (this.props.outputs.length) {
            const bottomOutputId = this.props.outputs[this.props.outputs.length - 1].id;
            document.getElementById(this.state.experiment.UUID+bottomOutputId)?.focus();
        }
    }

    private doHandleUpdateZoomSignal(hasZoomedIn: boolean) {
        this.zoomButton(hasZoomedIn);
    }

    private doHandleResetZoomSignal() {
        this.unitController.viewRange = { start: BigInt(0), end: this.unitController.absoluteRange };
    }

    private zoomButton(zoomIn: boolean) {
        let position = (this.unitController.viewRange.end + this.unitController.viewRange.start) / BigInt(2);
        if (this.unitController.selectionRange) {
            const positionMiddleSelection = (this.unitController.selectionRange.end + this.unitController.selectionRange.start) / BigInt(2);
            if (positionMiddleSelection >= this.unitController.viewRange.start && positionMiddleSelection <= this.unitController.viewRange.end) {
                position = positionMiddleSelection;
            }
        }
        const startDistance = position - this.unitController.viewRange.start;
        const zoomFactor = zoomIn ? 0.8 : 1.25;
        const newDuration = BIMath.clamp(Number(this.unitController.viewRangeLength) * zoomFactor,
            BigInt(2), this.unitController.absoluteRange);
        const newStartRange = BIMath.max(0, position - BIMath.round(Number(startDistance) * zoomFactor));
        const newEndRange = newStartRange + newDuration;
        this.unitController.viewRange = { start: newStartRange, end: newEndRange };
    }

    private onResize() {
        const newWidth = this.traceContextContainer.current ? this.traceContextContainer.current.clientWidth - this.SCROLLBAR_PADDING : 0;
        const bounds = this.traceContextContainer.current ? this.traceContextContainer.current.getBoundingClientRect() : { left: this.DEFAULT_COMPONENT_LEFT };
        this.setState(prevState => ({ style: { ...prevState.style, width: newWidth, componentLeft: bounds.left } }));
        this.widgetResizeHandlers.forEach(h => h());
    }

    private setChartOffset(chartOffset: number) {
        this.setState(prevState => ({ style: { ...prevState.style, chartOffset: chartOffset } }));
        this.widgetResizeHandlers.forEach(h => h());
    }

    private handleTimeSelectionChange(range?: TimelineChart.TimeGraphRange) {
        if (range) {
            const t1 = range.start + this.state.timeOffset;
            const t2 = range.end + this.state.timeOffset;

            this.props.messageManager.addStatusMessage(this.TIME_SELECTION_STATUS_BAR_KEY, {
                text: `T1: ${t1} T2: ${t2} Delta: ${t2 - t1}`,
                category: Messages.MessageCategory.TRACE_CONTEXT
            });
            this.setState(prevState => ({
                currentTimeSelection: new TimeRange(range.start, range.end, prevState.timeOffset)
            }));
        }
    }

    private handleViewRangeChange(viewRange: TimelineChart.TimeGraphRange) {
        this.setState(prevState => ({
            currentViewRange: new TimeRange(viewRange.start, viewRange.end, prevState.timeOffset)
        }));
    }

    private onContextMenu(event: React.MouseEvent) {
        event.preventDefault();
    }

    render(): JSX.Element {
        return <div className='trace-context-container'
            onContextMenu={event => this.onContextMenu(event)}
            onKeyDown={event => this.onKeyDown(event)}
            ref={this.traceContextContainer}>
            <TooltipComponent ref={this.tooltipComponent} />
            <TooltipXYComponent ref={this.tooltipXYComponent} />
            {this.props.outputs.length ? this.renderOutputs() : this.renderPlaceHolder()}
        </div>;
    }

    private onKeyDown(key: React.KeyboardEvent) {
        switch (key.key) {
            case '+':
            case '=': {
                this.zoomButton(true);
                break;
            }
            case '-':
            case '_': {
                this.zoomButton(false);
                break;
            }
        }
    }

    private renderOutputs() {
        const layouts = this.generateGridLayout();
        const outputs = this.props.outputs;
        const showTimeScale = outputs.filter(output => output.type === 'TIME_GRAPH' || output.type === 'TREE_TIME_XY').length > 0;
        const chartWidth = Math.max(0, this.state.style.width - this.state.style.chartOffset);
        return <React.Fragment>
            {showTimeScale &&
                <div style={{ marginLeft: this.state.style.chartOffset, marginRight: this.SCROLLBAR_PADDING }}>
                    <TimeAxisComponent unitController={this.unitController} style={{ ...this.state.style, width: chartWidth }}
                        addWidgetResizeHandler={this.addWidgetResizeHandler} removeWidgetResizeHandler={this.removeWidgetResizeHandler} />
                </div>
            }
            {
                // Syntax to use ReactGridLayout with Custom Components, while passing resized dimensions to children:
                // https://github.com/STRML/react-grid-layout/issues/299#issuecomment-524959229
            }
            <ResponsiveGridLayout className='outputs-grid-layout' margin={[0, 5]} isResizable={true} isDraggable={true} resizeHandles={['se', 's', 'sw']}
                layouts={{ lg: layouts }} cols={{ lg: 1 }} breakpoints={{ lg: 1200 }} rowHeight={this.DEFAULT_COMPONENT_ROWHEIGHT} draggableHandle={'.title-bar-label'}>
                {outputs.map(output => {
                    const responseType = output.type;
                    const outputProps: AbstractOutputProps = {
                        tspClient: this.props.tspClient,
                        tooltipComponent: this.tooltipComponent.current,
                        tooltipXYComponent: this.tooltipXYComponent.current,
                        traceId: this.state.experiment.UUID,
                        outputDescriptor: output,
                        markerCategories: this.props.markerCategoriesMap.get(output.id),
                        markerSetId: this.props.markerSetId,
                        range: this.state.currentRange,
                        nbEvents: this.state.experiment.nbEvents,
                        viewRange: this.state.currentViewRange,
                        selectionRange: this.state.currentTimeSelection,
                        style: this.state.style,
                        onOutputRemove: this.props.onOutputRemove,
                        unitController: this.unitController,
                        outputWidth: this.state.style.width,
                        backgroundTheme: this.state.backgroundTheme,
                        setChartOffset: this.setChartOffset
                    };
                    switch (responseType) {
                        case 'TIME_GRAPH':
                            return <TimegraphOutputComponent key={output.id} {...outputProps}
                                addWidgetResizeHandler={this.addWidgetResizeHandler} removeWidgetResizeHandler={this.removeWidgetResizeHandler} />;
                        case 'TREE_TIME_XY':
                            return <XYOutputComponent key={output.id} {...outputProps} />;
                        case 'TABLE':
                            return <TableOutputComponent key={output.id} {...outputProps} />;
                        case 'DATA_TREE':
                            return <DataTreeOutputComponent key={output.id} {...outputProps} />;
                        default:
                            return <NullOutputComponent key={output.id} {...outputProps} />;
                    }
                })}
            </ResponsiveGridLayout>
            {showTimeScale &&
                <div style={{ marginLeft: this.state.style.chartOffset, marginRight: this.SCROLLBAR_PADDING }}>
                    <TimeNavigatorComponent unitController={this.unitController} style={{ ...this.state.style, width: chartWidth }}
                        addWidgetResizeHandler={this.addWidgetResizeHandler} removeWidgetResizeHandler={this.removeWidgetResizeHandler} />
                </div>
            }
        </React.Fragment>;
    }

    private renderPlaceHolder() {
        return <div className='no-output-placeholder'>
            {'Trace loaded successfully.'}
            <br />
            {'To see available views, open the Trace Viewer.'}
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
