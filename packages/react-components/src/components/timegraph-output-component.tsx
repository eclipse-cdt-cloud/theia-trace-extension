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
import { signalManager, Signals } from '@trace-viewer/base/lib/signals/signal-manager';
import { AbstractOutputProps, AbstractOutputState } from './abstract-output-component';
import { AbstractTreeOutputComponent } from './abstract-tree-output-component';
import { StyleProperties } from './data-providers/style-properties';
import { StyleProvider } from './data-providers/style-provider';
import { TspDataProvider } from './data-providers/tsp-data-provider';
import { ReactTimeGraphContainer } from './utils/timegraph-container-component';
import { OutputElementStyle } from 'tsp-typescript-client/lib/models/styles';
import { EntryTree } from './utils/filtrer-tree/entry-tree';
import { listToTree, getAllExpandedNodeIds } from './utils/filtrer-tree/utils';
import hash from '@trace-viewer/base/lib/utils/value-hash';
import ColumnHeader from './utils/filtrer-tree/column-header';
import { TimeGraphAnnotationComponent } from 'timeline-chart/lib/components/time-graph-annotation';

type TimegraphOutputProps = AbstractOutputProps & {
    addWidgetResizeHandler: (handler: () => void) => void;
    removeWidgetResizeHandler: (handler: () => void) => void;
};

type TimegraphOutputState = AbstractOutputState & {
    timegraphTree: TimeGraphEntry[];
    collapsedNodes: number[];
    columns: ColumnHeader[];
};

export class TimegraphOutputComponent extends AbstractTreeOutputComponent<TimegraphOutputProps, TimegraphOutputState> {
    private totalHeight = 0;
    private rowController: TimeGraphRowController;
    private chartLayer: TimeGraphChart;
    private vscrollLayer: TimeGraphVerticalScrollbar;
    private chartCursors: TimeGraphChartCursors;
    private arrowLayer: TimeGraphChartArrows;
    private horizontalContainer: React.RefObject<HTMLDivElement>;
    private rangeEventsLayer: TimeGraphRangeEventsLayer;

    private tspDataProvider: TspDataProvider;
    private styleProvider: StyleProvider;
    private styleMap = new Map<string, TimeGraphStateStyle>();

    private selectedElement: TimeGraphStateComponent | undefined;

    private onSelectionChanged = (payload: { [key: string]: string; }) => this.doHandleSelectionChangedSignal(payload);
    private onTimeGraphZoomed = (hasZoomedIn: boolean) => this.doHandleTimeGraphZoomedSignal(hasZoomedIn);
    private onTimeGraphReset = () => this.doHandleTimeGraphResetSignal();

    constructor(props: TimegraphOutputProps) {
        super(props);
        this.state = {
            outputStatus: ResponseStatus.RUNNING,
            timegraphTree: [],
            collapsedNodes: [],
            columns: []
        };
        this.onToggleCollapse = this.onToggleCollapse.bind(this);
        this.tspDataProvider = new TspDataProvider(this.props.tspClient, this.props.traceId, this.props.outputDescriptor.id);
        this.styleProvider = new StyleProvider(this.props.outputDescriptor.id, this.props.traceId, this.props.tspClient);
        this.rowController = new TimeGraphRowController(this.props.style.rowHeight, this.totalHeight);
        this.horizontalContainer = React.createRef();
        const providers: TimeGraphChartProviders = {
            dataProvider: async (range: TimelineChart.TimeGraphRange, resolution: number) => this.fetchTimegraphData(range, resolution),
            stateStyleProvider: (state: TimelineChart.TimeGraphState) => this.getStateStyle(state),
            rowAnnotationStyleProvider: (annotation: TimelineChart.TimeGraphAnnotation) => this.getAnnotationStyle(annotation),
            rowStyleProvider: (row: TimelineChart.TimeGraphRowModel) => ({
                backgroundColor: 0x979797,// 0xaaaaff,
                backgroundOpacity: row.selected ? 0.1 : 0,
                lineColor: 0xdddddd, // hasStates ? 0xdddddd : 0xaa4444, // row.data && row.data.hasStates
                lineThickness: 1, // hasStates ? 1 : 3 // row.data && row.data.hasStates
            })
        };
        this.rangeEventsLayer = new TimeGraphRangeEventsLayer('timeGraphRangeEvents', providers);
        this.chartLayer = new TimeGraphChart('timeGraphChart', providers, this.rowController);
        this.arrowLayer = new TimeGraphChartArrows('timeGraphChartArrows', this.rowController);
        this.vscrollLayer = new TimeGraphVerticalScrollbar('timeGraphVerticalScrollbar', this.rowController);
        this.chartCursors = new TimeGraphChartCursors('chart-cursors', this.chartLayer, this.rowController, { color: this.props.style.cursorColor });
        this.rowController.onVerticalOffsetChangedHandler(() => {
            if (this.treeRef.current) {
                this.treeRef.current.scrollTop = this.rowController.verticalOffset;
            }
        });

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
            }
        });
        signalManager().on(Signals.SELECTION_CHANGED, this.onSelectionChanged);
        signalManager().on(Signals.TIMEGRAPH_ZOOMED, this.onTimeGraphZoomed);
        signalManager().on(Signals.TIMEGRAPH_RESET, this.onTimeGraphReset);
    }

    synchronizeTreeScroll(): void {
        if (this.treeRef.current) {
            this.rowController.verticalOffset = this.treeRef.current.scrollTop;
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
        signalManager().off(Signals.TIMEGRAPH_ZOOMED, this.onTimeGraphZoomed);
        signalManager().off(Signals.TIMEGRAPH_RESET, this.onTimeGraphReset);
    }

    async fetchTree(): Promise<ResponseStatus> {
        const parameters = QueryHelper.timeQuery([this.props.range.getstart(), this.props.range.getEnd()]);
        const tspClientResponse = await this.props.tspClient.fetchTimeGraphTree(this.props.traceId, this.props.outputDescriptor.id, parameters);
        const treeResponse = tspClientResponse.getModel();
        if (tspClientResponse.isOk() && treeResponse) {
            if (treeResponse.model) {
                const headers = treeResponse.model.headers;
                const columns = [];
                if (headers && headers.length > 0) {
                    headers.forEach(header => {
                        columns.push({ title: header.name, sortable: true, tooltip: header.tooltip });
                    });
                } else {
                    columns.push({ title: 'Name', sortable: true });
                }
                this.setState({
                    outputStatus: treeResponse.status,
                    timegraphTree: treeResponse.model.entries,
                    columns,
                }, this.updateTotalHeight);
            }
            return treeResponse.status;
        }
        return ResponseStatus.FAILED;
    }

    async componentDidUpdate(prevProps: TimegraphOutputProps, prevState: TimegraphOutputState): Promise<void> {
        if (prevState.outputStatus === ResponseStatus.RUNNING ||
            this.state.collapsedNodes !== prevState.collapsedNodes) {
            this.chartLayer.updateChart();
            this.arrowLayer.update();
            this.rangeEventsLayer.update();
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
        const offset = this.props.viewRange.getOffset() || 0;
        const startTimestamp = Number(payload['startTimestamp']);
        const endTimestamp = Number(payload['endTimestamp']);
        if (!isNaN(startTimestamp) && !isNaN(endTimestamp)) {
            const selectionRangeStart = startTimestamp - offset;
            const selectionRangeEnd = endTimestamp - offset;
            this.props.unitController.selectionRange = {
                start: selectionRangeStart,
                end: selectionRangeEnd
            };
            this.chartCursors.maybeCenterCursor();
        }
    }

    private doHandleTimeGraphZoomedSignal(hasZoomedIn: boolean) {
        this.chartLayer.adjustZoom(undefined, hasZoomedIn);
    }

    private doHandleTimeGraphResetSignal() {
        this.props.unitController.viewRange = { start: 0, end: this.props.unitController.absoluteRange };
    }

    renderTree(): React.ReactNode {
        // TODO Show header, when we can have entries in-line with timeline-chart
        return <EntryTree
            collapsedNodes={this.state.collapsedNodes}
            showFilter={false}
            entries={this.state.timegraphTree}
            showCheckboxes={false}
            onToggleCollapse={this.onToggleCollapse}
            showHeader={false}
            className="timegraph-tree"
        />;
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
            start = start ? start : (elementRange.start + (offset ? offset : 0)).toString();
            end = end ? end : (elementRange.end + (offset ? offset : 0)).toString();
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
            start = start ? start : (elementRange.start + (offset ? offset : 0)).toString();
            end = end ? end : (elementRange.end + (offset ? offset : 0)).toString();
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
        </div>;
    }

    private getChartContainer() {
        const grid = new TimeGraphChartGrid('timeGraphGrid', this.props.style.rowHeight, this.props.style.lineColor);
        const selectionRange = new TimeGraphChartSelectionRange('chart-selection-range', { color: this.props.style.cursorColor });
        return <ReactTimeGraphContainer
            options={
                {
                    id: 'timegraph-chart',
                    height: parseInt(this.props.style.height.toString()),
                    width: this.props.style.chartWidth, // this.props.style.mainWidth,
                    backgroundColor: this.props.style.chartBackgroundColor,
                    classNames: 'horizontal-canvas'
                }
            }
            addWidgetResizeHandler={this.props.addWidgetResizeHandler}
            removeWidgetResizeHandler={this.props.removeWidgetResizeHandler}
            unitController={this.props.unitController}
            id='timegraph-chart'
            layer={[
                grid, this.chartLayer, selectionRange, this.chartCursors, this.arrowLayer, this.rangeEventsLayer
            ]}
        >
        </ReactTimeGraphContainer>;
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
            layer={[this.vscrollLayer]}
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
        const treeNodes = listToTree(this.state.timegraphTree, this.state.columns);
        const orderedTreeIds = getAllExpandedNodeIds(treeNodes, this.state.collapsedNodes);
        const length = range.end - range.start;
        const overlap = ((length * 5) - length) / 2;
        const start = range.start - overlap > 0 ? range.start - overlap : 0;
        const end = range.end + overlap < this.props.unitController.absoluteRange ? range.end + overlap : this.props.unitController.absoluteRange;
        const newRange: TimelineChart.TimeGraphRange = { start, end };
        const newResolution: number = resolution * 0.8;
        const timeGraphData: TimelineChart.TimeGraphModel = await this.tspDataProvider.getData(orderedTreeIds, this.state.timegraphTree,
            this.props.range, newRange, this.props.style.chartWidth);
        this.arrowLayer.addArrows(timeGraphData.arrows);
        this.rangeEventsLayer.addRangeEvents(timeGraphData.rangeEvents);

        return {
            rows: timeGraphData ? timeGraphData.rows : [],
            range: newRange,
            resolution: newResolution
        };
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
        const val = state.label;
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
