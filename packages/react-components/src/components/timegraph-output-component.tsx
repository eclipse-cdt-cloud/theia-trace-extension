import * as React from 'react';
import { TimeGraphRowElement, TimeGraphRowElementStyle } from 'timeline-chart/lib/components/time-graph-row-element';
import { TimeGraphChart, TimeGraphChartProviders } from 'timeline-chart/lib/layer/time-graph-chart';
import { TimeGraphChartCursors } from 'timeline-chart/lib/layer/time-graph-chart-cursors';
import { TimeGraphChartGrid } from 'timeline-chart/lib/layer/time-graph-chart-grid';
import { TimeGraphChartSelectionRange } from 'timeline-chart/lib/layer/time-graph-chart-selection-range';
import { TimeGraphVerticalScrollbar } from 'timeline-chart/lib/layer/time-graph-vertical-scrollbar';
import { TimelineChart } from 'timeline-chart/lib/time-graph-model';
import { TimeGraphRowController } from 'timeline-chart/lib/time-graph-row-controller';
import { QueryHelper } from 'tsp-typescript-client/lib/models/query/query-helper';
import { ResponseStatus } from 'tsp-typescript-client/lib/models/response/responses';
import { TimeGraphEntry } from 'tsp-typescript-client/lib/models/timegraph';
import { signalManager, Signals } from '@trace-viewer/base/lib/signal-manager';
import { AbstractOutputProps, AbstractOutputState } from './abstract-output-component';
import { AbstractTreeOutputComponent } from './abstract-tree-output-component';
import { StyleProvider } from './data-providers/style-provider';
import { TspDataProvider } from './data-providers/tsp-data-provider';
import { ReactTimeGraphContainer } from './utils/timegraph-container-component';
import { OutputElementStyle } from 'tsp-typescript-client/lib/models/styles';
import { EntryTree } from './utils/filtrer-tree/entry-tree';
import { listToTree, getAllExpandedNodeIds } from './utils/filtrer-tree/utils';
import hash from '@trace-viewer/base/lib/utils/value-hash';
import ColumnHeader from './utils/filtrer-tree/column-header';

type TimegraphOutputProps = AbstractOutputProps & {
    addWidgetResizeHandler: (handler: () => void) => void;
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
    private horizontalContainer: React.RefObject<HTMLDivElement>;

    private tspDataProvider: TspDataProvider;
    private styleProvider: StyleProvider;
    private styleMap = new Map<string, TimeGraphRowElementStyle>();

    private selectedElement: TimeGraphRowElement | undefined;

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
            rowElementStyleProvider: (state: TimelineChart.TimeGraphState) => this.getStateStyle(state),
            rowAnnotationStyleProvider: (annotation: TimelineChart.TimeGraphAnnotation) => this.getAnnotationStyle(annotation),
            rowStyleProvider: (row: TimelineChart.TimeGraphRowModel) => ({
                backgroundColor: 0x979797,// 0xaaaaff,
                backgroundOpacity: row.selected ? 0.1 : 0,
                lineColor: 0xdddddd, // hasStates ? 0xdddddd : 0xaa4444, // row.data && row.data.hasStates
                lineThickness: 1, // hasStates ? 1 : 3 // row.data && row.data.hasStates
            })
        };
        this.chartLayer = new TimeGraphChart('timeGraphChart', providers, this.rowController);
        this.vscrollLayer = new TimeGraphVerticalScrollbar('timeGraphVerticalScrollbar', this.rowController);
        this.chartCursors = new TimeGraphChartCursors('chart-cursors', this.chartLayer, this.rowController, { color: this.props.style.cursorColor });
        this.rowController.onVerticalOffsetChangedHandler(() => {
            if (this.treeRef.current) {
                this.treeRef.current.scrollTop = this.rowController.verticalOffset;
            }
        });

        this.chartLayer.onSelectedRowElementChanged(model => {
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
        signalManager().on(Signals.SELECTION_CHANGED, ({ payload }) => this.onSelectionChanged(payload));
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
                        columns.push({title: header.name, sortable: true, tooltip: header.tooltip});
                    });
                } else {
                    columns.push({title: 'Name', sortable: true});
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

    private onSelectionChanged(payload: { [key: string]: number }) {
        const offset = this.props.viewRange.getOffset() || 0;
        const timestamp = Number(payload['timestamp']);
        if (!isNaN(timestamp)) {
            const selectionRangeStart = timestamp - offset;
            this.props.unitController.selectionRange = {
                start: selectionRangeStart,
                end: selectionRangeStart
            };
            this.chartCursors.maybeCenterCursor();
        }
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
                'Analysis running...'}
        </React.Fragment>;
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
            onWidgetResize={this.props.addWidgetResizeHandler}
            unitController={this.props.unitController}
            id='timegraph-chart'
            layer={[
                grid, this.chartLayer, selectionRange, this.chartCursors
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
            onWidgetResize={this.props.addWidgetResizeHandler}
            unitController={this.props.unitController}
            layer={[this.vscrollLayer]}
        ></ReactTimeGraphContainer>;
    }

    private async onElementSelected(element: TimeGraphRowElement | undefined) {
        if (element && this.props.viewRange) {
            const elementRange = element.model.range;
            const offset = this.props.viewRange.getOffset();
            const time = Math.round((elementRange.start + ((elementRange.end - elementRange.start) / 2)) + (offset ? offset : 0));
            const tooltipResponse = await this.props.tspClient.fetchTimeGraphToolTip(this.props.traceId, this.props.outputDescriptor.id, time, element.row.model.id.toString());
            const responseModel = tooltipResponse.getModel();
            if (responseModel) {
                const tooltipObject = {
                    'Label': element.model.label,
                    'Start time': (elementRange.start + (offset ? offset : 0)).toString(),
                    'End time': (elementRange.end + (offset ? offset : 0)).toString(),
                    ...responseModel.model,
                    'Row': element.row.model.name
                };
                signalManager().fireTooltipSignal(tooltipObject);
            }
        }
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
        const timeGraphData: TimelineChart.TimeGraphModel = await this.tspDataProvider.getData(orderedTreeIds, this.state.timegraphTree, newRange, this.props.style.chartWidth);
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
                const modelStyle = styleModel.styles[elementStyle.parentKey];
                if (modelStyle) {
                    const currentStyle = Object.assign({}, modelStyle.values, elementStyle.values);
                    if (currentStyle) {
                        const color = this.hexStringToNumber(currentStyle['background-color']);
                        let height = this.props.style.rowHeight * 0.8;
                        if (currentStyle['height']) {
                            height = currentStyle['height'] * height;
                        }
                        return {
                            color: color,
                            height: height,
                            borderWidth: state.selected ? 2 : 0,
                            borderColor: 0xeef20c
                        };
                    }
                }
            }
        }
        return this.getDefaultStateStyle(state);
    }
    private hexStringToNumber(hexString: string): number {
        return parseInt(hexString.replace(/^#/, ''), 16);
    }

    private getDefaultStateStyle(state: TimelineChart.TimeGraphState) {
        const styleProvider = new StyleProvider(this.props.outputDescriptor.id, this.props.traceId, this.props.tspClient);
        const styles = styleProvider.getStylesTmp();
        const backupStyles: TimeGraphRowElementStyle[] = [
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

        let style: TimeGraphRowElementStyle | undefined = backupStyles[0];
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
                const modelStyle = styleModel.styles[elementStyle.parentKey];
                let currentStyle = Object.assign({}, elementStyle.values);
                if (modelStyle) {
                    currentStyle = Object.assign({}, modelStyle.values, elementStyle.values);
                }
                if (currentStyle) {
                    let color = 0;
                    if (currentStyle['color']) {
                        color = this.hexStringToNumber(currentStyle['color']);
                    }
                    let symbolSize = this.props.style.rowHeight * 0.8 / 2;
                    if (currentStyle['height']) {
                        symbolSize = currentStyle['height'] * symbolSize;
                    }
                    return {
                        symbol: currentStyle['symbol-type'],
                        size: symbolSize,
                        color: color
                    };
                }
            }
        }
        return undefined;
    }
}
