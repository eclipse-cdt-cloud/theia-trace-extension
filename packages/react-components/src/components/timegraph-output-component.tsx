import * as React from 'react';
import { TimeGraphComponent } from 'timeline-chart/lib/components/time-graph-component';
import { TimeGraphStateComponent, TimeGraphStateStyle } from 'timeline-chart/lib/components/time-graph-state';
import { TimeGraphChart, TimeGraphChartProviders } from 'timeline-chart/lib/layer/time-graph-chart';
import { TimeGraphChartArrows } from 'timeline-chart/lib/layer/time-graph-chart-arrows';
import { TimeGraphRangeEventsLayer } from 'timeline-chart/lib/layer/time-graph-range-events-layer';
import { TimeGraphChartCursors } from 'timeline-chart/lib/layer/time-graph-chart-cursors';
import { TimeGraphChartGrid } from 'timeline-chart/lib/layer/time-graph-chart-grid';
import { TimeGraphChartSelectionRange } from 'timeline-chart/lib/layer/time-graph-chart-selection-range';
import { TimeGraphVerticalScrollbar } from 'timeline-chart/lib/layer/time-graph-vertical-scrollbar';
import { TimelineChart } from 'timeline-chart/lib/time-graph-model';
import { TimeGraphRowController } from 'timeline-chart/lib/time-graph-row-controller';
import { QueryHelper } from 'tsp-typescript-client/lib/models/query/query-helper';
import { ResponseStatus } from 'tsp-typescript-client/lib/models/response/responses';
import { TimeGraphEntry } from 'tsp-typescript-client/lib/models/timegraph';
import { signalManager, Signals } from 'traceviewer-base/lib/signals/signal-manager';
import { AbstractOutputProps, AbstractOutputState } from './abstract-output-component';
import { AbstractTreeOutputComponent } from './abstract-tree-output-component';
import { StyleProperties } from './data-providers/style-properties';
import { StyleProvider } from './data-providers/style-provider';
import { TspDataProvider } from './data-providers/tsp-data-provider';
import { ReactTimeGraphContainer } from './utils/timegraph-container-component';
import { OutputElementStyle } from 'tsp-typescript-client/lib/models/styles';
import { EntryTree } from './utils/filter-tree/entry-tree';
import { listToTree, getAllExpandedNodeIds } from './utils/filter-tree/utils';
import hash from 'traceviewer-base/lib/utils/value-hash';
import ColumnHeader from './utils/filter-tree/column-header';
import { TimeGraphAnnotationComponent } from 'timeline-chart/lib/components/time-graph-annotation';
import { Entry } from 'tsp-typescript-client';

type TimegraphOutputProps = AbstractOutputProps & {
    addWidgetResizeHandler: (handler: () => void) => void;
    removeWidgetResizeHandler: (handler: () => void) => void;
};

type TimegraphOutputState = AbstractOutputState & {
    timegraphTree: TimeGraphEntry[];
    markerCategoryEntries: Entry[];
    collapsedNodes: number[];
    collapsedMarkerNodes: number[];
    columns: ColumnHeader[];
};

export class TimegraphOutputComponent extends AbstractTreeOutputComponent<TimegraphOutputProps, TimegraphOutputState> {
    private totalHeight = 0;
    private rowController: TimeGraphRowController;
    private markerRowController: TimeGraphRowController;
    private chartLayer: TimeGraphChart;
    private markersChartLayer: TimeGraphChart;
    private vscrollLayer: TimeGraphVerticalScrollbar;
    private chartCursors: TimeGraphChartCursors;
    private arrowLayer: TimeGraphChartArrows;
    private rangeEventsLayer: TimeGraphRangeEventsLayer;

    private horizontalContainer: React.RefObject<HTMLDivElement>;
    private timeGraphTreeRef: React.RefObject<HTMLDivElement>;
    private markerTreeRef: React.RefObject<HTMLDivElement>;

    private tspDataProvider: TspDataProvider;
    private styleProvider: StyleProvider;
    private styleMap = new Map<string, TimeGraphStateStyle>();

    private selectedElement: TimeGraphStateComponent | undefined;
    private markerCategoriesLayerData: { rows: TimelineChart.TimeGraphRowModel[], range: TimelineChart.TimeGraphRange, resolution: number } | undefined = undefined;
    private selectedMarkerCategories: string[] | undefined = undefined;
    private onSelectionChanged = (payload: { [key: string]: string; }) => this.doHandleSelectionChangedSignal(payload);

    constructor(props: TimegraphOutputProps) {
        super(props);
        this.state = {
            outputStatus: ResponseStatus.RUNNING,
            timegraphTree: [],
            markerCategoryEntries: [],
            collapsedNodes: [],
            columns: [],
            collapsedMarkerNodes: []
        };
        this.selectedMarkerCategories = this.props.markerCategories;
        this.onToggleCollapse = this.onToggleCollapse.bind(this);
        this.onMarkerCategoryRowClose = this.onMarkerCategoryRowClose.bind(this);
        this.onToggleAnnotationCollapse = this.onToggleAnnotationCollapse.bind(this);
        this.tspDataProvider = new TspDataProvider(this.props.tspClient, this.props.traceId, this.props.outputDescriptor.id);
        this.styleProvider = new StyleProvider(this.props.outputDescriptor.id, this.props.traceId, this.props.tspClient);
        this.rowController = new TimeGraphRowController(this.props.style.rowHeight, this.totalHeight);
        this.markerRowController = new TimeGraphRowController(this.props.style.rowHeight, this.totalHeight);
        this.horizontalContainer = React.createRef();
        this.timeGraphTreeRef = React.createRef();
        this.markerTreeRef = React.createRef();
        const providers: TimeGraphChartProviders = {
            /**
             * @param range requested time range
             * @param resolution requested time interval between samples
             * @returns row models with the actual range and resolution
             */
            dataProvider: async (range: TimelineChart.TimeGraphRange, resolution: number) => this.fetchTimegraphData(range, resolution),
            stateStyleProvider: (state: TimelineChart.TimeGraphState) => this.getStateStyle(state),
            rowAnnotationStyleProvider: (annotation: TimelineChart.TimeGraphAnnotation) => this.getAnnotationStyle(annotation),
            rowStyleProvider: (row: TimelineChart.TimeGraphRowModel) => this.getRowStyle(row)
        };

        const markersProvider: TimeGraphChartProviders = {
            dataProvider: async (range: TimelineChart.TimeGraphRange, resolution: number) => this.fetchMarkersData(range, resolution),
            stateStyleProvider: (state: TimelineChart.TimeGraphState) => this.getMarkerStateStyle(state),
            rowStyleProvider: (row: TimelineChart.TimeGraphRowModel) => this.getRowStyle(row)
        };

        this.rangeEventsLayer = new TimeGraphRangeEventsLayer('timeGraphRangeEvents', providers);
        this.chartLayer = new TimeGraphChart('timeGraphChart', providers, this.rowController);
        this.arrowLayer = new TimeGraphChartArrows('timeGraphChartArrows', this.rowController);
        this.vscrollLayer = new TimeGraphVerticalScrollbar('timeGraphVerticalScrollbar', this.rowController);
        this.chartCursors = new TimeGraphChartCursors('chart-cursors', this.chartLayer, this.rowController, { color: this.props.style.cursorColor });
        this.rowController.onVerticalOffsetChangedHandler(() => {
            if (this.timeGraphTreeRef.current) {
                this.timeGraphTreeRef.current.scrollTop = this.rowController.verticalOffset;
            }
        });

        this.markersChartLayer = new TimeGraphChart('timeGraphChart', markersProvider, this.markerRowController);
        this.chartLayer.onSelectedStateChanged(model => {
            if (model) {
                const el = this.chartLayer.getElementById(model.id);
                if (el) {
                    this.selectedElement = el;
                }
            } else {
                this.selectedElement = undefined;
            }
            this.onElementSelected(this.selectedElement);
        });
        this.chartLayer.registerMouseInteractions({
            mouseover: el => {
                this.props.tooltipComponent?.setElement(el, () => this.fetchTooltip(el));
            },
            mouseout: () => {
                this.props.tooltipComponent?.setElement(undefined);
            },
            click: (el, ev, clickCount) => {
                if (clickCount === 2) {
                    const start = el.model.range.start;
                    const end = el.model.range.end;
                    if (start !== end) {
                        this.props.unitController.viewRange = {
                            start,
                            end
                        };
                    }
                }
            }
        });
        signalManager().on(Signals.SELECTION_CHANGED, this.onSelectionChanged);
    }

    synchronizeTreeScroll(): void {
        if (this.timeGraphTreeRef.current) {
            this.rowController.verticalOffset = this.timeGraphTreeRef.current.scrollTop;
        }
    }

    async componentDidMount(): Promise<void> {
        this.setState({
            styleModel: await this.styleProvider.getStyleModel()
        });
        this.waitAnalysisCompletion();
    }

    componentWillUnmount(): void {
        super.componentWillUnmount();
        signalManager().off(Signals.SELECTION_CHANGED, this.onSelectionChanged);
    }

    async fetchTree(): Promise<ResponseStatus> {
        const parameters = QueryHelper.timeQuery([this.props.range.getStart(), this.props.range.getEnd()]);
        const tspClientResponse = await this.props.tspClient.fetchTimeGraphTree(this.props.traceId, this.props.outputDescriptor.id, parameters);
        const treeResponse = tspClientResponse.getModel();
        if (tspClientResponse.isOk() && treeResponse) {
            if (treeResponse.model) {
                const headers = treeResponse.model.headers;
                const columns = [];
                if (headers && headers.length > 0) {
                    headers.forEach(header => {
                        columns.push({ title: header.name, sortable: true, resizable: true, tooltip: header.tooltip });
                    });
                } else {
                    columns.push({ title: 'Name', sortable: true });
                }
                this.setState({
                    outputStatus: treeResponse.status,
                    timegraphTree: treeResponse.model.entries,
                    columns
                }, this.updateTotalHeight);
            } else {
                this.setState({
                    outputStatus: treeResponse.status
                });
            }
            return treeResponse.status;
        }
        this.setState({
            outputStatus: ResponseStatus.FAILED
        });
        return ResponseStatus.FAILED;
    }

    async componentDidUpdate(prevProps: TimegraphOutputProps, prevState: TimegraphOutputState): Promise<void> {
        if (prevState.outputStatus === ResponseStatus.RUNNING ||
            this.state.collapsedNodes !== prevState.collapsedNodes ||
            prevProps.markerCategories !== this.props.markerCategories ||
            prevProps.markerSetId !== this.props.markerSetId) {
            this.selectedMarkerCategories = this.props.markerCategories;
            this.chartLayer.updateChart();
            this.markersChartLayer.updateChart();
            this.arrowLayer.update();
            this.rangeEventsLayer.update();
        }
        if (this.state.markerCategoryEntries !== prevState.markerCategoryEntries ||
            this.state.collapsedMarkerNodes !== prevState.collapsedMarkerNodes) {
            this.markersChartLayer.updateChart();
        }
    }

    private onToggleCollapse(id: number) {
        let newList = [...this.state.collapsedNodes];
        const exist = this.state.collapsedNodes.find(expandId => expandId === id);
        if (exist !== undefined) {
            newList = newList.filter(collapsed => id !== collapsed);
        } else {
            newList = newList.concat(id);
        }
        this.setState({ collapsedNodes: newList }, this.updateTotalHeight);
    }

    private onToggleAnnotationCollapse() {
        if (this.state.collapsedMarkerNodes.length === 0) {
            const annotationNodes = this.state.markerCategoryEntries.map(annotation => annotation.id);
            this.setState({ collapsedMarkerNodes: annotationNodes });
        } else {
            this.setState({ collapsedMarkerNodes: [] });
        }
    }

    private onMarkerCategoryRowClose(id: number) {
        const annotation = this.state.markerCategoryEntries.find(entry => entry.id === id);
        if (annotation && this.selectedMarkerCategories) {
            this.setState({
                markerCategoryEntries: this.state.markerCategoryEntries.filter(item => item !== annotation)
            });
            const removedIndex = this.selectedMarkerCategories.findIndex(annotationMarker => annotation.labels[0] === annotationMarker);
            if (removedIndex !== -1) {
                const annotationLabel = this.selectedMarkerCategories[removedIndex];
                this.selectedMarkerCategories = this.selectedMarkerCategories.filter(item => item !== annotationLabel);
                this.markerCategoriesLayerData?.rows.splice(removedIndex, 1);
                signalManager().fireMarkerCategoryClosedSignal({ traceViewerId: this.props.traceId, markerCategory: annotationLabel });
            }
            this.markersChartLayer.updateChart();
        }
    }

    private updateTotalHeight() {
        const visibleEntries = [...this.state.timegraphTree].filter(entry => this.isVisible(entry));
        this.totalHeight = visibleEntries.length * this.props.style.rowHeight;
        this.rowController.totalHeight = this.totalHeight;
    }

    private isVisible(entry: TimeGraphEntry): boolean {
        let parentId = entry.parentId;
        while (parentId !== undefined && parentId !== -1) {
            if (this.state.collapsedNodes.includes(parentId)) {
                return false;
            }
            const parent = this.state.timegraphTree.find(e => e.id === parentId);
            parentId = parent ? parent.parentId : undefined;
        }
        return true;
    }

    private doHandleSelectionChangedSignal(payload: { [key: string]: string }) {
        const offset = this.props.viewRange.getOffset() || BigInt(0);
        const startTimestamp = payload['startTimestamp'];
        const endTimestamp = payload['endTimestamp'];
        if (startTimestamp !== undefined && endTimestamp !== undefined) {
            const selectionRangeStart = BigInt(startTimestamp) - offset;
            const selectionRangeEnd = BigInt(endTimestamp) - offset;
            this.props.unitController.selectionRange = {
                start: selectionRangeStart,
                end: selectionRangeEnd
            };
            this.chartCursors.maybeCenterCursor();
        }
    }

    private getMarkersLayerHeight() {
        const rowHeight = 20;
        const scrollbarHeight = 10;
        return this.state.markerCategoryEntries.length <= 1 ? 0 :
            this.state.collapsedMarkerNodes.length ? rowHeight :
            this.state.markerCategoryEntries.length * rowHeight + scrollbarHeight;
    }

    renderTree(): React.ReactNode {
        // TODO Show header, when we can have entries in-line with timeline-chart
        return <>
            <div ref={this.timeGraphTreeRef} className='scrollable' onScroll={() => this.synchronizeTreeScroll()}
                style={{ height: parseInt(this.props.style.height.toString()) - this.getMarkersLayerHeight() }}
                tabIndex={0}
                >
                <EntryTree
                    collapsedNodes={this.state.collapsedNodes}
                    showFilter={false}
                    entries={this.state.timegraphTree}
                    showCheckboxes={false}
                    onToggleCollapse={this.onToggleCollapse}
                    showHeader={false}
                    className="table-tree timegraph-tree"
                />
            </div>
            <div ref={this.markerTreeRef} className='scrollable'
                style={{ height: this.getMarkersLayerHeight() }}>
                <EntryTree
                    collapsedNodes={this.state.collapsedMarkerNodes}
                    showFilter={false}
                    entries={this.state.markerCategoryEntries}
                    showCheckboxes={false}
                    showCloseIcons={true}
                    onToggleCollapse={this.onToggleAnnotationCollapse}
                    onClose={this.onMarkerCategoryRowClose}
                    showHeader={false}
                    className="table-tree timegraph-tree"
                />
            </div>
        </>;
    }

    renderYAxis(): React.ReactNode {
        return undefined;
    }

    renderChart(): React.ReactNode {
        return <React.Fragment>
            {this.state.outputStatus === ResponseStatus.COMPLETED ?
                <div id='timegraph-main' className='ps__child--consume' onWheel={ev => { ev.preventDefault(); ev.stopPropagation(); }} style={{ height: this.props.style.height }} >
                    {this.renderTimeGraphContent()}
                </div> :
                <div className='analysis-running'>
                    {(
                        <i
                            className='fa fa-refresh fa-spin'
                            style={{ marginRight: '5px' }}
                        />
                    )}
                    {
                        'Analysis running'
                    }
                </div>
            }
        </React.Fragment>;
    }

    resultsAreEmpty(): boolean {
        return this.state.timegraphTree.length === 0;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private async fetchTooltip(element: TimeGraphComponent<any>): Promise<{ [key: string]: string } | undefined> {
        if (element instanceof TimeGraphStateComponent) {
            const label = element.model.label ? element.model.label : '';
            const elementRange = element.model.range;
            const offset = this.props.viewRange.getOffset();
            let start: string | undefined;
            let end: string | undefined;
            if (this.props.unitController.numberTranslator) {
                start = this.props.unitController.numberTranslator(elementRange.start);
                end = this.props.unitController.numberTranslator(elementRange.end);
            }
            start = start ? start : (elementRange.start + (offset ? offset : BigInt(0))).toString();
            end = end ? end : (elementRange.end + (offset ? offset : BigInt(0))).toString();
            const tooltip = await this.tspDataProvider.fetchStateTooltip(element, this.props.viewRange);
            return {
                'Label': label,
                'Start time': start,
                'End time': end,
                'Row': element.row.model.name,
                ...tooltip
            };
        } else if (element instanceof TimeGraphAnnotationComponent) {
            const category = element.model.category ? element.model.category : 'Label';
            const label = element.model.label ? element.model.label : '';
            const elementRange = element.model.range;
            const offset = this.props.viewRange.getOffset();
            let start: string | undefined;
            let end: string | undefined;
            if (this.props.unitController.numberTranslator) {
                start = this.props.unitController.numberTranslator(elementRange.start);
                end = this.props.unitController.numberTranslator(elementRange.end);
            }
            start = start ? start : (elementRange.start + (offset ? offset : BigInt(0))).toString();
            end = end ? end : (elementRange.end + (offset ? offset : BigInt(0))).toString();
            const tooltip = await this.tspDataProvider.fetchAnnotationTooltip(element, this.props.viewRange);
            if (start === end) {
                return {
                    [category]: label,
                    'Timestamp': start,
                    'Row': element.row.model.name,
                    ...tooltip
                };
            } else {
                return {
                    [category]: label,
                    'Start time': start,
                    'End time': end,
                    'Row': element.row.model.name,
                    ...tooltip
                };
            }
        }
    }

    private renderTimeGraphContent() {
        return <div id='main-timegraph-content' ref={this.horizontalContainer} style={{ height: this.props.style.height }} >
            {this.getChartContainer()}
            {this.getMarkersContainer()}
        </div>;
    }

    private getMarkersContainer() {
        return <ReactTimeGraphContainer
            options={
                {
                    id: 'timegraph-chart-1',
                    height: this.getMarkersLayerHeight(),
                    width: this.getChartWidth(),
                    backgroundColor: this.props.style.chartBackgroundColor,
                    lineColor: this.props.style.lineColor,
                    classNames: 'horizontal-canvas'
                }
            }
            addWidgetResizeHandler={this.props.addWidgetResizeHandler}
            removeWidgetResizeHandler={this.props.removeWidgetResizeHandler}
            unitController={this.props.unitController}
            id='timegraph-chart-1'
            layers={[this.markersChartLayer]}
        >
        </ReactTimeGraphContainer>;

    }

    private getChartContainer() {
        const grid = new TimeGraphChartGrid('timeGraphGrid', this.props.style.rowHeight, this.props.backgroundTheme === 'light' ? 0xdddddd : 0x34383C);
        const selectionRange = new TimeGraphChartSelectionRange('chart-selection-range', { color: this.props.style.cursorColor });
        return <ReactTimeGraphContainer
            options={
                {
                    id: this.props.traceId + this.props.outputDescriptor.id + 'focusContainer',
                    height: parseInt(this.props.style.height.toString()) - this.getMarkersLayerHeight(),
                    width: this.getChartWidth(),
                    backgroundColor: this.props.style.chartBackgroundColor,
                    lineColor: this.props.backgroundTheme === 'light' ? 0xdddddd : 0x34383C,
                    classNames: 'horizontal-canvas'
                }
            }
            addWidgetResizeHandler={this.props.addWidgetResizeHandler}
            removeWidgetResizeHandler={this.props.removeWidgetResizeHandler}
            unitController={this.props.unitController}
            id={this.props.traceId + this.props.outputDescriptor.id + 'focusContainer'}
            layers={[
                grid, this.chartLayer, selectionRange, this.chartCursors, this.arrowLayer, this.rangeEventsLayer
            ]}
        >
        </ReactTimeGraphContainer>;
    }

    setFocus(): void {
        if (document.getElementById(this.props.traceId + this.props.outputDescriptor.id + 'focusContainer')) {
            document.getElementById(this.props.traceId + this.props.outputDescriptor.id + 'focusContainer')?.focus();
        } else {
            document.getElementById(this.props.traceId + this.props.outputDescriptor.id)?.focus();
        }
    }

    protected getVerticalScrollbar(): JSX.Element {
        return <ReactTimeGraphContainer
            id='vscroll'
            options={{
                id: 'vscroll',
                width: 10,
                height: parseInt(this.props.style.height.toString()),
                backgroundColor: this.props.style.naviBackgroundColor
            }}
            addWidgetResizeHandler={this.props.addWidgetResizeHandler}
            removeWidgetResizeHandler={this.props.removeWidgetResizeHandler}
            unitController={this.props.unitController}
            layers={[this.vscrollLayer]}
        ></ReactTimeGraphContainer>;
    }

    private async onElementSelected(element: TimeGraphStateComponent | undefined) {
        let tooltipObject = undefined;
        if (element && this.props.viewRange) {
            tooltipObject = await this.fetchTooltip(element);
        }
        signalManager().fireTooltipSignal(tooltipObject);
    }

    private async fetchTimegraphData(range: TimelineChart.TimeGraphRange, resolution: number) {
        if (document.getElementById(this.props.traceId + this.props.outputDescriptor.id + 'handleSpinner')) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            document.getElementById(this.props.traceId + this.props.outputDescriptor.id + 'handleSpinner')!.style.visibility = 'visible';
        }

        const treeNodes = listToTree(this.state.timegraphTree, this.state.columns);
        const orderedTreeIds = getAllExpandedNodeIds(treeNodes, this.state.collapsedNodes);
        const overlap = range.end - range.start;
        const start = range.start - overlap > 0 ? range.start - overlap : BigInt(0);
        const end = range.end + overlap < this.props.unitController.absoluteRange ? range.end + overlap : this.props.unitController.absoluteRange;
        const newRange: TimelineChart.TimeGraphRange = { start, end };
        const nbTimes = Math.ceil(Number(end - start) / resolution) + 1;
        const timeGraphData: TimelineChart.TimeGraphModel = await this.tspDataProvider.getData(orderedTreeIds, this.state.timegraphTree,
            this.props.range, newRange, nbTimes, this.props.markerCategories, this.props.markerSetId);
        this.updateMarkersData(timeGraphData.rangeEvents, newRange, nbTimes);
        this.arrowLayer.addArrows(timeGraphData.arrows);
        this.rangeEventsLayer.addRangeEvents(timeGraphData.rangeEvents);

        if (document.getElementById(this.props.traceId + this.props.outputDescriptor.id + 'handleSpinner')) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            document.getElementById(this.props.traceId + this.props.outputDescriptor.id + 'handleSpinner')!.style.visibility = 'hidden';
        }
        return {
            rows: timeGraphData ? timeGraphData.rows : [],
            range: newRange,
            resolution: resolution
        };
    }

    private updateMarkersData(rangeEvents: TimelineChart.TimeGraphAnnotation[], newRange: TimelineChart.TimeGraphRange, newResolution: number) {
        const annotationEntries: Entry[] = [];
        const markers: Map<string, TimelineChart.TimeGraphState[]> = new Map();
        const rows: TimelineChart.TimeGraphRowModel[] = [];
        const filteredEvents = rangeEvents.filter(event => this.selectedMarkerCategories?.includes(event.category));

        filteredEvents.forEach(event => {
            const categoryName = event.category;
            if (!markers.has(categoryName)) {
                markers.set(categoryName, []);
            }
            const states = markers.get(categoryName) || [];
            const state = {
                id: '1',
                range: {
                    start: event.range.start,
                    end: event.range.end
                },
                label: event.label,
                data: {
                    style: event.data?.style,
                    annotation: event
                }
            };
            states.push(state);
        });

        if (markers.size > 0) {
            const defaultRow = {
                id: 1,
                name: '',
                range: {
                    start: this.props.viewRange.getStart(),
                    end: this.props.viewRange.getStart() + this.props.unitController.absoluteRange
                },
                states: [],
                annotations: [],
                prevPossibleState: BigInt(Number.MIN_SAFE_INTEGER),
                nextPossibleState: BigInt(Number.MAX_SAFE_INTEGER)
            };
            rows.push(defaultRow);

            annotationEntries.push({
                id: 0,
                labels: [''],
                parentId: -1
            });
        }

        Array.from(markers.entries()).forEach((value, index) => {
            annotationEntries.push({
                id: index + 1,
                labels: [value[0]],
                parentId: 0
            });

            const row = {
                id: 1,
                name: '',
                range: {
                    start: this.props.viewRange.getStart(),
                    end: this.props.viewRange.getStart() + this.props.unitController.absoluteRange
                },
                states: value[1],
                annotations: [],
                prevPossibleState: BigInt(Number.MIN_SAFE_INTEGER),
                nextPossibleState: BigInt(Number.MAX_SAFE_INTEGER)
            };
            rows.push(row);
        });

        this.markerCategoriesLayerData = {
            rows,
            range: newRange,
            resolution: newResolution
        };

        this.setState({ markerCategoryEntries: annotationEntries });
    }

    private async fetchMarkersData(range: TimelineChart.TimeGraphRange, resolution: number) {
        const rows = (this.state.collapsedMarkerNodes.length !== 0 || !!!this.markerCategoriesLayerData) ? [] : this.markerCategoriesLayerData.rows;
        return {
            rows,
            range: this.markerCategoriesLayerData ? this.markerCategoriesLayerData.range : range,
            resolution: this.markerCategoriesLayerData ? this.markerCategoriesLayerData.resolution : resolution
        };
    }

    private getRowStyle(row: TimelineChart.TimeGraphRowModel) {
        return {
            backgroundColor: 0x979797,// 0xaaaaff,
            backgroundOpacity: row.selected ? 0.1 : 0,
            lineColor: this.props.backgroundTheme === 'light' ? 0xD3D3D3 : 0x3F4146, // hasStates ? 0xdddddd : 0xaa4444, // row.data && row.data.hasStates
            lineThickness: 1, // hasStates ? 1 : 3 // row.data && row.data.hasStates
        };
    }

    private getMarkerStateStyle(state: TimelineChart.TimeGraphState) {
        if (state.data && state.data.annotation) {
            const annotation = state.data.annotation;
            const style = this.getAnnotationStyle(annotation);
            return {
                color: style ? style.color : 0x000000,
                height: this.markerRowController.rowHeight,
                borderWidth: 1,
                borderColor: 0x000000
            };
        }

        return this.getStateStyle(state);
    }

    private getStateStyle(state: TimelineChart.TimeGraphState) {
        const styleModel = this.state.styleModel;
        if (styleModel) {
            const metadata = state.data;
            if (metadata && metadata.style) {
                const elementStyle: OutputElementStyle = metadata.style;
                const backgroundColor = this.styleProvider.getColorStyle(elementStyle, StyleProperties.BACKGROUND_COLOR);
                const heightFactor = this.styleProvider.getNumberStyle(elementStyle, StyleProperties.HEIGHT);
                let height = this.props.style.rowHeight * 0.8;
                if (heightFactor) {
                    height = heightFactor * height;
                }
                const borderStyle = this.styleProvider.getStyle(elementStyle, StyleProperties.BORDER_STYLE);
                let borderColor = undefined;
                let borderWidth = undefined;
                if (borderStyle && borderStyle !== 'none') {
                    borderColor = this.styleProvider.getColorStyle(elementStyle, StyleProperties.BORDER_COLOR);
                    if (borderColor === undefined) {
                        borderColor = { color: 0x000000, alpha: 1 };
                    }
                    borderWidth = this.styleProvider.getNumberStyle(elementStyle, StyleProperties.BORDER_WIDTH);
                    if (borderWidth === undefined) {
                        borderWidth = 1;
                    }
                }
                return {
                    color: backgroundColor ? backgroundColor.color : 0x000000,
                    opacity: backgroundColor ? backgroundColor.alpha : 1.0,
                    height: height,
                    borderWidth: state.selected ? 2 : (borderWidth ? borderWidth : 0),
                    borderColor: state.selected ? 0xeef20c : (borderColor ? borderColor.color : 0x000000)
                };
            }
            return undefined;
        }
        return this.getDefaultStateStyle(state);
    }

    private getDefaultStateStyle(state: TimelineChart.TimeGraphState) {
        const styleProvider = new StyleProvider(this.props.outputDescriptor.id, this.props.traceId, this.props.tspClient);
        const styles = styleProvider.getStylesTmp();
        const backupStyles: TimeGraphStateStyle[] = [
            {
                color: 0x3891A6,
                height: this.props.style.rowHeight * 0.8
            }, {
                color: 0x4C5B5C,
                height: this.props.style.rowHeight * 0.7
            }, {
                color: 0xFDE74C,
                height: this.props.style.rowHeight * 0.6
            }, {
                color: 0xDB5461,
                height: this.props.style.rowHeight * 0.5
            }, {
                color: 0xE3655B,
                height: this.props.style.rowHeight * 0.4
            }, {
                color: 0xEA8F87,
                height: this.props.style.rowHeight * 0.9
            }, {
                color: 0xDE636F,
                height: this.props.style.rowHeight * 0.3
            },
        ];

        let style: TimeGraphStateStyle | undefined = backupStyles[0];
        const val = state.label ?? '';
        const modelData = state.data;
        if (modelData) {
            const outputStyle = modelData.style;
            if (!outputStyle) {
                return {
                    color: 0xCACACA,
                    height: this.props.style.rowHeight * 0.5,
                    borderWidth: state.selected ? 2 : 0,
                    borderColor: 0xeef20c
                };
            }

            const stateStyle = outputStyle as OutputElementStyle;
            const elementStyle = styles[stateStyle.parentKey];
            if (elementStyle) {
                return {
                    color: parseInt(elementStyle.color, 16),
                    height: this.props.style.rowHeight * elementStyle.height,
                    borderWidth: state.selected ? 2 : 0,
                    borderColor: 0xeef20c
                };
            }

            style = this.styleMap.get(stateStyle.parentKey);
            if (style === undefined) {
                style = backupStyles[(Math.abs(hash(stateStyle.parentKey)) as number % backupStyles.length)];
                this.styleMap.set(stateStyle.parentKey, style);
            }
            return {
                color: style.color,
                height: style.height,
                borderWidth: state.selected ? 2 : 0,
                borderColor: 0xeef20c
            };
        }

        style = this.styleMap.get(val);
        if (!style) {
            style = backupStyles[(this.styleMap.size % backupStyles.length)];
            this.styleMap.set(val, style);
        }
        return {
            color: style.color,
            height: style.height,
            borderWidth: state.selected ? 2 : 0,
            borderColor: 0xeef20c
        };
    }

    private getAnnotationStyle(annotation: TimelineChart.TimeGraphAnnotation) {
        const styleModel = this.state.styleModel;
        if (styleModel) {
            const metadata = annotation.data;
            if (metadata && metadata.style) {
                const elementStyle: OutputElementStyle = metadata.style;
                const symbolType = this.styleProvider.getStyle(elementStyle, StyleProperties.SYMBOL_TYPE);
                const color = this.styleProvider.getColorStyle(elementStyle, StyleProperties.COLOR);
                const heightFactor = this.styleProvider.getNumberStyle(elementStyle, StyleProperties.HEIGHT);
                let symbolSize = this.props.style.rowHeight * 0.8 / 2;
                if (heightFactor) {
                    symbolSize = heightFactor * symbolSize;
                }
                const vAlign = this.styleProvider.getStyle(elementStyle, StyleProperties.VERTICAL_ALIGN);
                return {
                    symbol: symbolType ? symbolType : 'none',
                    size: symbolSize,
                    color: color ? color.color : 0x000000,
                    opacity: color ? color.alpha : 1.0,
                    verticalAlign: vAlign ? vAlign : 'middle'
                };
            }
        }
        return undefined;
    }
}
