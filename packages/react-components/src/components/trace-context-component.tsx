import * as React from 'react';
import '../../style/trace-viewer.css';
import '../../style/trace-context-style.css';
import '../../style/output-components-style.css';
import '../../style/trace-explorer.css';
import '../../style/status-bar.css';
import { Layout, Responsive, WidthProvider } from 'react-grid-layout';
import { TimelineChart } from 'timeline-chart/lib/time-graph-model';
import { TimeGraphUnitController } from 'timeline-chart/lib/time-graph-unit-controller';
import { OutputDescriptor, ProviderType } from 'tsp-typescript-client/lib/models/output-descriptor';
import { Experiment } from 'tsp-typescript-client/lib/models/experiment';
import { ITspClient } from 'tsp-typescript-client/lib/protocol/tsp-client';
import { TimeRange, TimeRangeString } from 'traceviewer-base/lib/utils/time-range';
import { TableOutputComponent } from './table-output-component';
import { TimegraphOutputComponent } from './timegraph-output-component';
import { OutputComponentStyle } from './utils/output-component-style';
import { TimeAxisComponent } from './utils/time-axis-component';
import { TimeNavigatorComponent } from './utils/time-navigator-component';
import { XYOutputComponent } from './xy-output-component';
import { NullOutputComponent } from './null-output-component';
import { AbstractOutputProps } from './abstract-output-component';
import * as Messages from 'traceviewer-base/lib/message-manager';
import { signalManager } from 'traceviewer-base/lib/signals/signal-manager';
import ReactTooltip from 'react-tooltip';
import { TooltipComponent } from './tooltip-component';
import { TooltipXYComponent } from './tooltip-xy-component';
import { BIMath } from 'timeline-chart/lib/bigint-utils';
import { DataTreeOutputComponent } from './datatree-output-component';
import { cloneDeep } from 'lodash';
import { UnitControllerHistoryHandler } from './utils/unit-controller-history-handler';
import { TraceOverviewComponent } from './trace-overview-component';
import { TimeRangeUpdatePayload } from 'traceviewer-base/lib/signals/time-range-data-signal-payloads';

const ResponsiveGridLayout = WidthProvider(Responsive);

export interface TraceContextProps {
    tspClient: ITspClient;
    experiment: Experiment;
    outputs: OutputDescriptor[];
    overviewDescriptor?: OutputDescriptor; // The default output descriptor for the overview
    markerCategoriesMap: Map<string, string[]>;
    markerSetId: string;
    onOutputRemove: (outputId: string) => void;
    onOverviewRemove: () => void;
    // Introduce dependency on Theia maybe it should be just a callback
    messageManager: Messages.MessageManager;
    addResizeHandler: (handler: () => void) => void;
    removeResizeHandler: (handler: () => void) => void;
    backgroundTheme: string;
    persistedState?: PersistedState;
}

export interface TraceContextState {
    timeOffset: bigint;
    currentRange: TimeRange;
    currentViewRange: TimeRange;
    currentTimeSelection: TimeRange | undefined;
    experiment: Experiment;
    traceIndexing: boolean;
    style: OutputComponentStyle;
    backgroundTheme: string;
    pinnedView: OutputDescriptor | undefined;
}

export interface PersistedState {
    outputs: OutputDescriptor[];
    currentRange: TimeRangeString;
    currentViewRange: TimeRangeString;
    currentTimeSelection?: TimeRangeString;
    unitControllerViewRange: { start: string; end: string };
    storedTimescaleLayout: Layout[];
    storedNonTimescaleLayout: Layout[];
    pinnedView: OutputDescriptor | undefined;
    storedPinnedViewLayout: Layout | undefined;
    storedOverviewOutput: OutputDescriptor | undefined;
    storedOverviewLayout: Layout | undefined;
}

export class TraceContextComponent extends React.Component<TraceContextProps, TraceContextState> {
    private readonly INDEXING_RUNNING_STATUS: string = 'RUNNING';
    private readonly INDEXING_CLOSED_STATUS: string = 'CLOSED';
    private readonly INDEXING_STATUS_BAR_KEY = 'indexing-status';
    private readonly TIME_SELECTION_STATUS_BAR_KEY = 'time-selection-range';
    private readonly OVERVIEW_OUTPUT_GRID_LAYOUT_ID = 'Overview';
    private readonly DEFAULT_COMPONENT_HEIGHT: number = 10;
    private readonly DEFAULT_COMPONENT_ROWHEIGHT: number = 20;
    private readonly DEFAULT_OVERVIEW_HEIGHT: number = 7;
    private readonly DEFAULT_OVERVIEW_ROWHEIGHT: number = 14;
    private readonly DEFAULT_COMPONENT_LEFT: number = 0;
    private readonly SCROLLBAR_PADDING: number = 12;
    private readonly DEFAULT_CHART_OFFSET = 200;
    private readonly MIN_COMPONENT_HEIGHT: number = 2;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private chartPersistedState: { output: OutputDescriptor; payload?: any } | undefined = undefined;

    private unitController: TimeGraphUnitController;
    private historyHandler: UnitControllerHistoryHandler;
    private tooltipComponent: React.RefObject<TooltipComponent>;
    private tooltipXYComponent: React.RefObject<TooltipXYComponent>;
    private traceContextContainer: React.RefObject<HTMLDivElement>;
    private _storedTimescaleLayout: Layout[] = [];
    private _storedNonTimescaleLayout: Layout[] = [];
    private _storedPinnedViewLayout: Layout | undefined = undefined;
    private _storedOverviewLayout: Layout | undefined = undefined;

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private onPinView = (output: OutputDescriptor, extra?: any) => this.doHandlePinView(output, extra);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private onUnPinView = (output: OutputDescriptor, extra?: any) => this.doHandleUnPinView(output, extra);

    constructor(props: TraceContextProps) {
        super(props);
        let traceRange = new TimeRange();
        let viewRange = new TimeRange();
        let timeSelection = undefined;
        let curPinnedView = undefined;
        if (this.props.experiment) {
            const experiment = this.props.experiment;
            traceRange = new TimeRange(
                experiment.start - this.props.experiment.start,
                experiment.end - this.props.experiment.start,
                this.props.experiment.start
            );
            viewRange = new TimeRange(
                experiment.start - this.props.experiment.start,
                experiment.end - this.props.experiment.start,
                this.props.experiment.start
            );
            if (this.props.persistedState) {
                const {
                    currentRange: storedRange,
                    currentViewRange: storedViewRange,
                    currentTimeSelection: storedTimeSelection,
                    pinnedView: storedPinnedView,
                    storedTimescaleLayout,
                    storedNonTimescaleLayout,
                    storedPinnedViewLayout,
                    storedOverviewLayout
                } = this.props.persistedState;
                traceRange = new TimeRange(storedRange);
                viewRange = new TimeRange(storedViewRange);
                if (storedTimeSelection) {
                    timeSelection = new TimeRange(storedTimeSelection);
                }
                this._storedTimescaleLayout = storedTimescaleLayout;
                this._storedNonTimescaleLayout = storedNonTimescaleLayout;
                curPinnedView = storedPinnedView;
                this._storedPinnedViewLayout = storedPinnedViewLayout;
                this._storedOverviewLayout = storedOverviewLayout;
            }
        }
        this.state = {
            timeOffset: this.props.experiment.start,
            currentRange: traceRange,
            currentViewRange: viewRange,
            currentTimeSelection: timeSelection,
            experiment: this.props.experiment,
            pinnedView: curPinnedView,
            traceIndexing:
                this.props.experiment.indexingStatus === this.INDEXING_RUNNING_STATUS ||
                this.props.experiment.indexingStatus === this.INDEXING_CLOSED_STATUS,
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
        const offset = viewRange.getOffset();
        const viewRangeStart = viewRange.getStart() - (offset ? offset : BigInt(0));
        const viewRangeEnd = viewRange.getEnd() - (offset ? offset : BigInt(0));
        this.unitController = new TimeGraphUnitController(absoluteRange, { start: viewRangeStart, end: viewRangeEnd });
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
        this.unitController.worldRenderFactor = 0.25;
        this.historyHandler = new UnitControllerHistoryHandler(this.unitController);
        if (this.props.persistedState?.currentTimeSelection) {
            const { start, end } = this.props.persistedState.currentTimeSelection;
            this.unitController.selectionRange = { start: BigInt(start), end: BigInt(end) };
        }
        this.unitController.onSelectionRangeChange(range => {
            this.handleTimeSelectionChange(range);
        });
        this.unitController.onViewRangeChanged((oldRange, newRange) => {
            this.handleViewRangeChange(oldRange, newRange);
        });
        this.tooltipComponent = React.createRef();
        this.tooltipXYComponent = React.createRef();
        this.traceContextContainer = React.createRef();
        this.onResize = this.onResize.bind(this);
        this.setChartOffset = this.setChartOffset.bind(this);
        this.onLayoutChange = this.onLayoutChange.bind(this);
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
        this.unitController.offset = this.state.timeOffset;
        if (this.unitController.viewRangeLength === BigInt(0)) {
            // set the initial view range if not set yet
            this.unitController.viewRange = {
                start: BigInt(0),
                end: this.state.experiment.end - this.state.timeOffset
            };
        }
        this.historyHandler.clear();
        this.historyHandler.addCurrentState();
        this.emitTimeRangeData();
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
                        currentRange: new TimeRange(
                            updatedExperiment.start - updatedExperiment.start,
                            updatedExperiment.end - updatedExperiment.start,
                            updatedExperiment.start
                        )
                    });

                    this.unitController.absoluteRange = this.state.experiment.end - this.state.timeOffset;
                    this.unitController.offset = this.state.timeOffset;
                    signalManager().emit('EXPERIMENT_UPDATED', updatedExperiment);

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
        // When indexing is completed
        const finalResponse = await this.props.tspClient.fetchExperiment(this.props.experiment.UUID);
        signalManager().emit('EXPERIMENT_UPDATED', finalResponse.getModel() || this.props.experiment);
        this.emitTimeRangeData();
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
        signalManager().on('THEME_CHANGED', this.onBackgroundThemeChange);
        signalManager().on('UPDATE_ZOOM', this.onUpdateZoom);
        signalManager().on('RESET_ZOOM', this.onResetZoom);
        signalManager().on('UNDO', this.undoHistory);
        signalManager().on('REDO', this.redoHistory);
        signalManager().on('PIN_VIEW', this.onPinView);
        signalManager().on('UNPIN_VIEW', this.onUnPinView);
        signalManager().on('REQUEST_SELECTION_RANGE_CHANGE', this.onRequestToUpdateSelectionRange);
    }

    private unsubscribeToEvents() {
        signalManager().off('THEME_CHANGED', this.onBackgroundThemeChange);
        signalManager().off('UPDATE_ZOOM', this.onUpdateZoom);
        signalManager().off('RESET_ZOOM', this.onResetZoom);
        signalManager().off('UNDO', this.undoHistory);
        signalManager().off('REDO', this.redoHistory);
        signalManager().off('PIN_VIEW', this.onPinView);
        signalManager().off('UNPIN_VIEW', this.onUnPinView);
        signalManager().off('REQUEST_SELECTION_RANGE_CHANGE', this.onRequestToUpdateSelectionRange);
    }

    async componentDidUpdate(prevProps: TraceContextProps, prevState: TraceContextState): Promise<void> {
        // Rebuild enables tooltip on newly added output component
        ReactTooltip.rebuild();
        if (prevProps.outputs.length < this.props.outputs.length) {
            // added a new output - scroll to bottom
            this.scrollToBottom();
            if (this.unitController.viewRangeLength === BigInt(0)) {
                // set the initial view range if not set yet
                this.unitController.viewRange = {
                    start: BigInt(0),
                    end: this.state.experiment.end - this.state.timeOffset
                };
            }
        } else if (
            prevProps.outputs.length === this.props.outputs.length &&
            prevState.pinnedView === undefined &&
            this.state.pinnedView !== undefined
        ) {
            // one of the existing outputs is pinned to top - scroll to top
            this.scrollToPinnedView();
        } else if (
            prevProps.outputs.length === this.props.outputs.length &&
            prevState.pinnedView !== undefined &&
            this.state.pinnedView === undefined
        ) {
            // one of the existing outputs is unpinned - scroll to unpinned output
            this.scrollToUnPinnedView(prevState.pinnedView);
        }
    }

    private scrollToBottom(): void {
        if (this.props.outputs.length) {
            const bottomOutputId = this.props.outputs[this.props.outputs.length - 1].id;
            document.getElementById(this.state.experiment.UUID + bottomOutputId)?.focus();
        }
    }

    private scrollToPinnedView(): void {
        if (this.state.pinnedView) {
            document.getElementById(this.state.experiment.UUID + this.state.pinnedView.id)?.focus();
        }
    }

    private scrollToUnPinnedView(view: OutputDescriptor) {
        if (view) {
            document.getElementById(this.state.experiment.UUID + view.id)?.focus();
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
            const positionMiddleSelection =
                (this.unitController.selectionRange.end + this.unitController.selectionRange.start) / BigInt(2);
            if (
                positionMiddleSelection >= this.unitController.viewRange.start &&
                positionMiddleSelection <= this.unitController.viewRange.end
            ) {
                position = positionMiddleSelection;
            }
        }
        const startDistance = position - this.unitController.viewRange.start;
        const zoomFactor = zoomIn ? 0.8 : 1.25;
        const newDuration = BIMath.clamp(
            Number(this.unitController.viewRangeLength) * zoomFactor,
            BigInt(2),
            this.unitController.absoluteRange
        );
        const newStartRange = BIMath.max(0, position - BIMath.round(Number(startDistance) * zoomFactor));
        const newEndRange = newStartRange + newDuration;
        this.unitController.viewRange = { start: newStartRange, end: newEndRange };
    }

    private onResize() {
        const newWidth = this.traceContextContainer.current
            ? this.traceContextContainer.current.clientWidth - this.SCROLLBAR_PADDING
            : 0;
        const bounds = this.traceContextContainer.current
            ? this.traceContextContainer.current.getBoundingClientRect()
            : { left: this.DEFAULT_COMPONENT_LEFT };
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

            const { start, end } = range;
            const payload = {
                experimentUUID: this.props.experiment.UUID,
                timeRange: new TimeRange(start, end)
            } as TimeRangeUpdatePayload;
            signalManager().emit('SELECTION_RANGE_UPDATED', payload);

            this.setState(
                prevState => ({
                    currentTimeSelection: new TimeRange(range.start, range.end, prevState.timeOffset)
                }),
                () => this.updateHistory()
            );
        }
    }

    private handleViewRangeChange(oldRange: TimelineChart.TimeGraphRange, newRange: TimelineChart.TimeGraphRange) {
        const { start, end } = newRange;
        const payload = {
            experimentUUID: this.props.experiment.UUID,
            timeRange: new TimeRange(start, end)
        } as TimeRangeUpdatePayload;
        signalManager().emit('VIEW_RANGE_UPDATED', payload);

        this.setState(
            prevState => ({
                currentViewRange: new TimeRange(newRange.start, newRange.end, prevState.timeOffset)
            }),
            () => this.updateHistory()
        );
    }

    private emitTimeRangeData = (): void => {
        const { viewRange, selectionRange } = this.unitController;
        const payload = {
            experimentUUID: this.props.experiment.UUID,
            timeRange: new TimeRange(viewRange.start, viewRange.end)
        } as TimeRangeUpdatePayload;
        signalManager().emit('VIEW_RANGE_UPDATED', payload);
        if (selectionRange) {
            payload.timeRange = new TimeRange(selectionRange.start, selectionRange.end);
            signalManager().emit('SELECTION_RANGE_UPDATED', payload);
        }
    };

    private onContextMenu(event: React.MouseEvent) {
        event.preventDefault();
    }

    private onLayoutChange(currentLayout: Layout[]): void {
        if (currentLayout.length > 0) {
            const curLayoutCopy = cloneDeep(currentLayout);
            if (this._storedPinnedViewLayout && this._storedPinnedViewLayout.i === currentLayout[0].i) {
                this._storedPinnedViewLayout = curLayoutCopy[0];
            } else if (this._storedOverviewLayout && this._storedOverviewLayout.i === currentLayout[0].i) {
                this._storedOverviewLayout = curLayoutCopy[0];
            } else if (this._storedTimescaleLayout.find(obj => obj.i === currentLayout[0].i)) {
                this._storedTimescaleLayout = curLayoutCopy;
            } else {
                this._storedNonTimescaleLayout = curLayoutCopy;
            }
        }
    }

    render(): JSX.Element {
        const shouldRenderOutputs =
            this.state.style.width > 0 && (this.props.outputs.length || this.props.overviewDescriptor);
        return (
            <div
                className="trace-context-container"
                onContextMenu={event => this.onContextMenu(event)}
                onKeyDown={event => this.onKeyDown(event)}
                onKeyUp={event => this.onKeyUp(event)}
                ref={this.traceContextContainer}
            >
                <TooltipComponent ref={this.tooltipComponent} />
                <TooltipXYComponent ref={this.tooltipXYComponent} />
                {shouldRenderOutputs ? this.renderOutputs() : this.renderPlaceHolder()}
            </div>
        );
    }

    private onKeyDown(event: React.KeyboardEvent) {
        if (
            document.activeElement &&
            (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')
        ) {
            // User is typing in an input field, ignore the shortcut
            return;
        }

        switch (event.key) {
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
            case 'z': {
                this.zoomToSelected();
                break;
            }
        }
    }

    private onKeyUp(event: React.KeyboardEvent): void {
        if (event.ctrlKey) {
            switch (event.key) {
                case 'z': {
                    this.undoHistory();
                    break;
                }
                case 'Z': {
                    if (event.shiftKey) {
                        this.redoHistory();
                        break;
                    }
                }
                case 'y': {
                    this.redoHistory();
                    break;
                }
            }
        }
    }

    private zoomToSelected(): void {
        const newZoom = this.unitController.selectionRange;
        if (newZoom) {
            this.unitController.viewRange = newZoom;
        }
    }

    private renderOutputs() {
        this.generateGridLayout();
        const chartWidth = Math.max(0, this.state.style.width - this.state.style.chartOffset);

        const timeScaleCharts: Array<OutputDescriptor> = [];
        const nonTimeScaleCharts: Array<OutputDescriptor> = [];

        for (const output of this.props.outputs) {
            if (this.state.pinnedView?.id === output.id) {
                continue;
            } else if (output.type === 'TIME_GRAPH' || output.type === 'TREE_TIME_XY') {
                timeScaleCharts.push(output);
            } else {
                nonTimeScaleCharts.push(output);
            }
        }

        const pinnedViewTimeScale =
            this.state.pinnedView?.type === 'TIME_GRAPH' || this.state.pinnedView?.type === 'TREE_TIME_XY';
        const timeScaleChartExists = timeScaleCharts.length > 0 || pinnedViewTimeScale;

        return (
            <React.Fragment>
                {
                    // Syntax to use ReactGridLayout with Custom Components, while passing resized dimensions to children:
                    // https://github.com/STRML/react-grid-layout/issues/299#issuecomment-524959229
                }
                {this.props.overviewDescriptor && this._storedOverviewLayout && (
                    // Margin required to have the close button clickable, else overlapped by the tooltip container
                    <div style={{ marginTop: '30px' }}>
                        {this.renderGridLayout([this.props.overviewDescriptor], [this._storedOverviewLayout], true)}
                    </div>
                )}
                {this.state.pinnedView !== undefined &&
                    this._storedPinnedViewLayout !== undefined &&
                    !pinnedViewTimeScale && (
                        <div
                            className="pinned-views-layout"
                            style={{ marginTop: !this.props.overviewDescriptor ? '30px' : '0px' }}
                        >
                            {this.renderGridLayout([this.state.pinnedView], [this._storedPinnedViewLayout])}
                        </div>
                    )}
                {timeScaleChartExists && (
                    <>
                        <div style={{ marginLeft: this.state.style.chartOffset, marginRight: this.SCROLLBAR_PADDING }}>
                            <TimeAxisComponent
                                unitController={this.unitController}
                                style={{ ...this.state.style, width: chartWidth, verticalAlign: 'bottom' }}
                                addWidgetResizeHandler={this.addWidgetResizeHandler}
                                removeWidgetResizeHandler={this.removeWidgetResizeHandler}
                            />
                        </div>
                    </>
                )}
                {this.state.pinnedView !== undefined &&
                    this._storedPinnedViewLayout !== undefined &&
                    pinnedViewTimeScale && (
                        <div className="pinned-views-layout">
                            {this.renderGridLayout([this.state.pinnedView], [this._storedPinnedViewLayout])}
                        </div>
                    )}
                <div className="outputs-grid-layout">
                    {timeScaleCharts.length > 0 && (
                        <>{this.renderGridLayout(timeScaleCharts, this._storedTimescaleLayout)}</>
                    )}
                    {timeScaleChartExists && (
                        <>
                            <div
                                className="sticky-div"
                                style={{
                                    marginLeft: this.state.style.chartOffset,
                                    marginRight: this.SCROLLBAR_PADDING
                                }}
                            >
                                <TimeNavigatorComponent
                                    unitController={this.unitController}
                                    style={{ ...this.state.style, width: chartWidth }}
                                    addWidgetResizeHandler={this.addWidgetResizeHandler}
                                    removeWidgetResizeHandler={this.removeWidgetResizeHandler}
                                />
                            </div>
                        </>
                    )}

                    {nonTimeScaleCharts.length > 0 && (
                        <div
                            style={{
                                marginTop:
                                    !timeScaleChartExists &&
                                    this.state.pinnedView === undefined &&
                                    !this.props.overviewDescriptor
                                        ? '30px'
                                        : '0px'
                            }}
                        >
                            {this.renderGridLayout(nonTimeScaleCharts, this._storedNonTimescaleLayout)}
                        </div>
                    )}
                </div>
            </React.Fragment>
        );
    }

    private renderGridLayout(outputs: OutputDescriptor[], layout: Layout[], isOverview?: boolean) {
        const rowHeight = isOverview ? this.DEFAULT_OVERVIEW_ROWHEIGHT : this.DEFAULT_COMPONENT_ROWHEIGHT;
        return (
            <ResponsiveGridLayout
                margin={[0, 5]}
                isResizable={true}
                isDraggable={true}
                resizeHandles={['se', 's', 'sw']}
                onLayoutChange={this.onLayoutChange}
                layouts={{ lg: layout }}
                cols={{ lg: 1 }}
                breakpoints={{ lg: 1200 }}
                rowHeight={rowHeight}
                draggableHandle={'.title-bar-label'}
            >
                {outputs.map(output => {
                    let onOutputRemove;
                    let responseType;
                    if (isOverview) {
                        onOutputRemove = this.props.onOverviewRemove;
                        responseType = 'OVERVIEW';
                    } else {
                        onOutputRemove = this.props.onOutputRemove;
                        responseType = output.type;
                    }

                    const outputProps: AbstractOutputProps = {
                        tspClient: this.props.tspClient,
                        tooltipComponent: this.tooltipComponent.current,
                        tooltipXYComponent: this.tooltipXYComponent.current,
                        traceId: this.state.experiment.UUID,
                        traceName: this.props.experiment.name,
                        outputDescriptor: output,
                        markerCategories: this.props.markerCategoriesMap.get(output.id),
                        markerSetId: this.props.markerSetId,
                        range: this.state.currentRange,
                        nbEvents: this.state.experiment.nbEvents,
                        viewRange: this.state.currentViewRange,
                        selectionRange: this.state.currentTimeSelection,
                        style: this.state.style,
                        onOutputRemove: onOutputRemove,
                        unitController: this.unitController,
                        outputWidth: this.state.style.width,
                        backgroundTheme: this.state.backgroundTheme,
                        setChartOffset: this.setChartOffset,
                        pinned: this.state.pinnedView ? this.state.pinnedView === output : undefined
                    };
                    switch (responseType) {
                        case 'OVERVIEW':
                            return (
                                <TraceOverviewComponent
                                    key={this.OVERVIEW_OUTPUT_GRID_LAYOUT_ID}
                                    experiment={this.props.experiment}
                                    {...outputProps}
                                ></TraceOverviewComponent>
                            );
                        case ProviderType.TIME_GRAPH:
                            if (this.chartPersistedState && this.chartPersistedState.output.id === output.id) {
                                outputProps.persistChartState = this.chartPersistedState.payload;
                                this.chartPersistedState = undefined;
                            }
                            return (
                                <TimegraphOutputComponent
                                    key={output.id}
                                    {...outputProps}
                                    addWidgetResizeHandler={this.addWidgetResizeHandler}
                                    removeWidgetResizeHandler={this.removeWidgetResizeHandler}
                                    className={this.state.pinnedView?.id === output.id ? 'pinned-view-shadow' : ''}
                                />
                            );
                        case ProviderType.TREE_TIME_XY:
                            if (this.chartPersistedState && this.chartPersistedState.output.id === output.id) {
                                outputProps.persistChartState = this.chartPersistedState.payload;
                                this.chartPersistedState = undefined;
                            }
                            return (
                                <XYOutputComponent
                                    key={output.id}
                                    {...outputProps}
                                    className={this.state.pinnedView?.id === output.id ? 'pinned-view-shadow' : ''}
                                />
                            );
                        case ProviderType.TABLE:
                            return (
                                <TableOutputComponent
                                    key={output.id}
                                    {...outputProps}
                                    className={this.state.pinnedView?.id === output.id ? 'pinned-view-shadow' : ''}
                                />
                            );
                        case ProviderType.DATA_TREE:
                            return (
                                <DataTreeOutputComponent
                                    key={output.id}
                                    {...outputProps}
                                    className={this.state.pinnedView?.id === output.id ? 'pinned-view-shadow' : ''}
                                />
                            );
                        default:
                            return (
                                <NullOutputComponent
                                    key={output.id}
                                    {...outputProps}
                                    className={this.state.pinnedView?.id === output.id ? 'pinned-view-shadow' : ''}
                                />
                            );
                    }
                })}
            </ResponsiveGridLayout>
        );
    }

    get persistedState(): PersistedState {
        const { currentRange, currentViewRange, currentTimeSelection, pinnedView } = this.state;
        const {
            _storedNonTimescaleLayout: storedNonTimescaleLayout,
            _storedTimescaleLayout: storedTimescaleLayout,
            _storedPinnedViewLayout: storedPinnedViewLayout,
            _storedOverviewLayout: storedOverviewLayout
        } = this;
        const { start: ucStart, end: ucEnd } = this.unitController.viewRange;
        return {
            outputs: this.props.outputs,
            currentRange: currentRange.toString(),
            currentViewRange: currentViewRange.toString(),
            unitControllerViewRange: { start: ucStart.toString(), end: ucEnd.toString() },
            currentTimeSelection: currentTimeSelection?.toString(),
            storedNonTimescaleLayout,
            storedTimescaleLayout,
            pinnedView,
            storedPinnedViewLayout,
            storedOverviewOutput: this.props.overviewDescriptor,
            storedOverviewLayout: storedOverviewLayout
        };
    }

    private renderPlaceHolder() {
        if (this.props.outputs.length === 0) {
            this._storedTimescaleLayout = [];
            this._storedNonTimescaleLayout = [];
        }
        return (
            <div className="no-output-placeholder">
                {'Trace loaded successfully.'}
                <br />
                {'To see available views, open the Trace Viewer.'}
            </div>
        );
    }

    private undoHistory = (): void => {
        this.historyHandler.undo();
    };

    private redoHistory = (): void => {
        this.historyHandler.redo();
    };

    private updateHistory = (): void => {
        this.historyHandler.addCurrentState();
    };

    onRequestToUpdateSelectionRange = (payload: TimeRangeUpdatePayload): void => {
        const { timeRange, experimentUUID } = payload;
        if (experimentUUID === this.props.experiment.UUID && timeRange) {
            this.unitController.selectionRange = {
                start: timeRange.getStart(),
                end: timeRange.getEnd()
            };
        }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private doHandleUnPinView(output: OutputDescriptor, payload?: any) {
        this.chartPersistedState = { output: output, payload: payload };
        this.setState({
            pinnedView: undefined
        });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private doHandlePinView(output: OutputDescriptor, payload?: any) {
        this.chartPersistedState = { output: output, payload: payload };
        this.setState({
            pinnedView: output
        });
    }

    private generateGridLayout(): void {
        let existingTimeScaleLayouts: Array<Layout> = [];
        let existingNonTimeScaleLayouts: Array<Layout> = [];
        let existingPinnedLayout: Layout | undefined = undefined;
        const newTimeScaleLayouts: Array<Layout> = [];
        const newNonTimeScaleLayouts: Array<Layout> = [];

        for (const output of this.props.outputs) {
            const curChartTimeLine = this._storedTimescaleLayout.find(layout => layout.i === output.id);
            const curChartNonTimeLine = this._storedNonTimescaleLayout.find(layout => layout.i === output.id);

            if (this.state.pinnedView && output.id === this._storedPinnedViewLayout?.i) {
                existingPinnedLayout = this._storedPinnedViewLayout;
            } else if (this.state.pinnedView?.id === output.id) {
                let prevLayout: Layout | undefined = undefined;
                if (output.type === 'TIME_GRAPH' || output.type === 'TREE_TIME_XY') {
                    prevLayout = this._storedTimescaleLayout.find(layout => layout.i === output.id);
                } else {
                    prevLayout = this._storedNonTimescaleLayout.find(layout => layout.i === output.id);
                }
                existingPinnedLayout = {
                    i: output.id,
                    x: 0,
                    y: 1,
                    w: 1,
                    h: prevLayout ? prevLayout.h : this.DEFAULT_COMPONENT_HEIGHT,
                    minH: this.MIN_COMPONENT_HEIGHT,
                    resizeHandles: ['se', 's', 'sw', 'n', 'ne']
                } as Layout;
            } else if (curChartTimeLine) {
                existingTimeScaleLayouts.push(curChartTimeLine);
            } else if (curChartNonTimeLine) {
                existingNonTimeScaleLayouts.push(curChartNonTimeLine);
            } else if (output.type === 'TIME_GRAPH' || output.type === 'TREE_TIME_XY') {
                const prevLayout =
                    this._storedPinnedViewLayout?.i === output.id ? this._storedPinnedViewLayout : undefined;
                newTimeScaleLayouts.push({
                    i: output.id,
                    x: 0,
                    y: 1,
                    w: 1,
                    h: prevLayout ? prevLayout.h : this.DEFAULT_COMPONENT_HEIGHT,
                    minH: this.MIN_COMPONENT_HEIGHT
                });
            } else {
                const prevLayout =
                    this._storedPinnedViewLayout?.i === output.id ? this._storedPinnedViewLayout : undefined;
                newNonTimeScaleLayouts.push({
                    i: output.id,
                    x: 0,
                    y: 1,
                    w: 1,
                    h: prevLayout ? prevLayout.h : this.DEFAULT_COMPONENT_HEIGHT,
                    minH: this.MIN_COMPONENT_HEIGHT
                });
            }
        }

        existingTimeScaleLayouts.sort((a, b) => (a.y > b.y ? 1 : -1));
        existingNonTimeScaleLayouts.sort((a, b) => (a.y > b.y ? 1 : -1));

        existingTimeScaleLayouts = existingTimeScaleLayouts.concat(newTimeScaleLayouts);
        existingNonTimeScaleLayouts = existingNonTimeScaleLayouts.concat(newNonTimeScaleLayouts);

        this._storedTimescaleLayout = existingTimeScaleLayouts;
        this._storedNonTimescaleLayout = existingNonTimeScaleLayouts;
        this._storedPinnedViewLayout = existingPinnedLayout;

        // At times after layout change RGL changes y values of existing charts from 1,2,3 to 10,20,30
        this._storedTimescaleLayout.forEach((output, index) => {
            output.y = index;
        });
        this._storedNonTimescaleLayout.forEach((output, index) => {
            output.y = index;
        });

        if (!this._storedOverviewLayout) {
            this._storedOverviewLayout = {
                i: this.OVERVIEW_OUTPUT_GRID_LAYOUT_ID,
                x: 0,
                y: 0,
                w: 1,
                minH: this.MIN_COMPONENT_HEIGHT,
                h: this.DEFAULT_OVERVIEW_HEIGHT,
                resizeHandles: ['se', 's', 'sw']
            };
        }
    }
}
