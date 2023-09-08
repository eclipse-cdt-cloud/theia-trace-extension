/* eslint-disable @typescript-eslint/no-explicit-any */
import { AbstractOutputProps } from './abstract-output-component';
import { AbstractTreeOutputComponent, AbstractTreeOutputState } from './abstract-tree-output-component';
import { ResponseStatus } from 'tsp-typescript-client/lib/models/response/responses';
import { QueryHelper } from 'tsp-typescript-client/lib/models/query/query-helper';
import { Entry } from 'tsp-typescript-client/lib/models/entry';
import ColumnHeader from './utils/filter-tree/column-header';
import { TreeNode } from './utils/filter-tree/tree-node';
import { scaleLinear } from 'd3-scale';
import { axisLeft } from 'd3-axis';
import { select } from 'd3-selection';
import { EntryTree } from './utils/filter-tree/entry-tree';
import { XyEntry, XYSeries } from 'tsp-typescript-client/lib/models/xy';
import * as React from 'react';
import { flushSync } from 'react-dom';
import { TimeRange } from 'traceviewer-base/lib/utils/time-range';
import { BIMath } from 'timeline-chart/lib/bigint-utils';
import {
    XYChartFactoryParams,
    xyChartFactory,
    GetClosestPointParam,
    getClosestPointForScatterPlot
} from './utils/xy-output-component-utils';
import { ChartOptions } from 'chart.js';
import { Line, Scatter } from 'react-chartjs-2';
import { getAllExpandedNodeIds } from './utils/filter-tree/utils';
import { debounce } from 'lodash';

export const ZOOM_IN_RATE = 0.8;
export const ZOOM_OUT_RATE = 1.25;

export const FLAG_ZOOM_IN = true;
export const FLAG_ZOOM_OUT = false;
export const FLAG_PAN_LEFT = true;
export const FLAG_PAN_RIGHT = false;

export enum XY_OUTPUT_KEY_ACTIONS {
    ZOOM_IN,
    ZOOM_OUT,
    PAN_LEFT,
    PAN_RIGHT,
    SHIFT_PRESS
}

export enum MouseButton {
    NONE = -1,
    LEFT = 0,
    MID = 1,
    RIGHT = 2
}

export type AbstractXYOutputState = AbstractTreeOutputState & {
    selectedSeriesId: number[];
    xyTree: Entry[];
    checkedSeries: number[];
    collapsedNodes: number[];
    orderedNodes: number[];
    // FIXME Type this properly
    xyData: any;
    columns: ColumnHeader[];
    allMax: number;
    allMin: number;
    cursor?: string;
};

class xyPair {
    x: number;
    y: number;
    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }
}

export abstract class AbstractXYOutputComponent<
    P extends AbstractOutputProps,
    S extends AbstractXYOutputState
> extends AbstractTreeOutputComponent<P, S> {
    // References
    private yAxisRef: any;
    protected divRef: any;
    protected chartRef: any;

    // Styles
    private currentColorIndex = 0;
    private colorMap: Map<string, number> = new Map();
    protected margin = { top: 15, right: 0, bottom: 5, left: this.getYAxisWidth() };

    // Chart properties
    protected isScatterPlot: boolean = this.props.outputDescriptor.id.includes('scatter');
    protected isBarPlot = false;
    protected keyActionMap = new Map<string, XY_OUTPUT_KEY_ACTIONS>();
    private preventDefaultHandler: ((event: WheelEvent) => void) | undefined;
    protected posPixelSelect = 0;
    protected positionYMove = 0;

    // Event flags
    protected isMouseLeave = false;
    protected clickedMouseButton: MouseButton = MouseButton.NONE;
    protected mouseIsDown = false;
    protected isPanning = false;
    protected isSelecting = false;

    // Positions
    protected positionXMove = 0;
    protected startPositionMouseRightClick = BigInt(0);

    protected endSelection = (event: MouseEvent): void => {
        if (this.clickedMouseButton === MouseButton.RIGHT) {
            this.applySelectionZoom();
        }

        this.mouseIsDown = false;
        this.isSelecting = false;
        this.isPanning = false;
        this.clickedMouseButton = MouseButton.NONE;

        if (!event.shiftKey && !event.ctrlKey) {
            this.setState({ cursor: 'default' });
        } else if (!event.shiftKey && event.ctrlKey) {
            this.setState({ cursor: 'grabbing' });
        } else if (event.shiftKey && !event.ctrlKey) {
            this.setState({ cursor: 'crosshair' });
        } else {
            this.setState({ cursor: 'default' });
        }

        document.removeEventListener('mouseup', this.endSelection);
    };

    private plugin = {
        afterDraw: (chartInstance: Chart, _easing: Chart.Easing, _options?: any) => {
            this.afterChartDraw(chartInstance.ctx, chartInstance.chartArea);
        }
    };

    private _debouncedUpdateXY = debounce(() => this.updateXY(), 500);

    constructor(props: P) {
        super(props);

        this.yAxisRef = React.createRef();
        this.divRef = React.createRef();
        this.chartRef = React.createRef();

        this.afterChartDraw = this.afterChartDraw.bind(this);
    }

    protected abstract afterChartDraw(ctx: CanvasRenderingContext2D | null, chartArea?: Chart.ChartArea | null): void;

    /**
     * Get the display range for the current chart.
     * For generic XY output, the displayed range is the view range.
     * For the overview output, the displayed range is the trace full range.
     */
    protected abstract getDisplayedRange(): TimeRange;

    /**
     * Returns the time that the chart should zooms into/out to.
     */
    protected abstract getZoomTime(): bigint;

    protected onToggleCollapse(id: number, nodes: TreeNode[]): void {
        let newList = [...this.state.collapsedNodes];

        const exist = this.state.collapsedNodes.find(expandId => expandId === id);

        if (exist !== undefined) {
            newList = newList.filter(collapsed => id !== collapsed);
        } else {
            newList = newList.concat(id);
        }
        const orderedIds = getAllExpandedNodeIds(nodes, newList);
        this.setState({ collapsedNodes: newList, orderedNodes: orderedIds });
    }

    protected onOrderChange(ids: number[]): void {
        this.setState({ orderedNodes: ids });
    }

    protected onToggleCheck(ids: number[]): void {
        let newList = [...this.state.checkedSeries];
        ids.forEach(id => {
            const exist = this.state.checkedSeries.find(seriesId => seriesId === id);

            if (exist !== undefined) {
                newList = newList.filter(series => id !== series);
            } else {
                newList = newList.concat(id);
            }
        });
        this.setState({ checkedSeries: newList });
    }

    private updateRange(rangeStart: bigint, rangeEnd: bigint): void {
        if (rangeEnd < rangeStart) {
            const temp = rangeStart;
            rangeStart = rangeEnd;
            rangeEnd = temp;
        }
        this.props.unitController.viewRange = {
            start: rangeStart,
            end: rangeEnd
        };
    }

    private applySelectionZoom(): void {
        const newStartRange = this.startPositionMouseRightClick;
        const newEndRange = this.getTimeForX(this.positionXMove);
        this.updateRange(newStartRange, newEndRange);
    }

    protected updateSelection(): void {
        if (this.props.unitController.selectionRange) {
            const xStartPos = this.props.unitController.selectionRange.start;
            this.props.unitController.selectionRange = {
                start: xStartPos,
                end: this.getTimeForX(this.positionXMove)
            };
        }
    }

    componentDidMount(): void {
        this.waitAnalysisCompletion();
    }

    componentDidUpdate(prevProps: AbstractOutputProps, prevState: AbstractXYOutputState): void {
        const viewRangeChanged = this.props.viewRange !== prevProps.viewRange;
        const checkedSeriesChanged = this.state.checkedSeries !== prevState.checkedSeries;
        const collapsedNodesChanged = this.state.collapsedNodes !== prevState.collapsedNodes;
        const chartWidthChanged =
            this.props.style.width !== prevProps.style.width ||
            this.props.style.chartOffset !== prevProps.style.chartOffset ||
            this.props.style.componentLeft !== prevProps.style.componentLeft;
        const outputStatusChanged = this.state.outputStatus !== prevState.outputStatus;
        const needToUpdate =
            viewRangeChanged ||
            checkedSeriesChanged ||
            collapsedNodesChanged ||
            chartWidthChanged ||
            outputStatusChanged;

        if (needToUpdate) {
            this._debouncedUpdateXY();
        }

        if (this.chartRef.current) {
            if (this.preventDefaultHandler === undefined) {
                this.preventDefaultHandler = (event: WheelEvent) => {
                    if (event.ctrlKey) {
                        event.preventDefault();
                    }
                };
                this.divRef.current.addEventListener('wheel', this.preventDefaultHandler);
            }

            if (this.isBarPlot) {
                this.renderChart();
            } else {
                this.chartRef.current.chartInstance.render();
            }
        }
    }

    componentWillUnmount(): void {
        super.componentWillUnmount();
    }

    async fetchTree(): Promise<ResponseStatus> {
        this.viewSpinner(true);
        const parameters = QueryHelper.timeRangeQuery(this.props.range.getStart(), this.props.range.getEnd());
        const tspClientResponse = await this.props.tspClient.fetchXYTree(
            this.props.traceId,
            this.props.outputDescriptor.id,
            parameters
        );
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
                const checkedSeries = this.getAllCheckedIds(treeResponse.model.entries);
                this.setState(
                    {
                        outputStatus: treeResponse.status,
                        xyTree: treeResponse.model.entries,
                        checkedSeries,
                        columns
                    },
                    () => {
                        this.updateXY();
                    }
                );
            } else {
                this.setState({
                    outputStatus: treeResponse.status
                });
            }
            this.viewSpinner(false);
            return treeResponse.status;
        }
        this.setState({
            outputStatus: ResponseStatus.FAILED
        });
        this.viewSpinner(false);
        return ResponseStatus.FAILED;
    }

    getAllCheckedIds(entries: Array<XyEntry>): Array<number> {
        const checkedSeries: number[] = [];
        for (const entry of entries) {
            if (entry.isDefault) {
                checkedSeries.push(entry.id);
            }
        }
        return checkedSeries;
    }

    renderTree(): React.ReactNode | undefined {
        this.onToggleCheck = this.onToggleCheck.bind(this);
        this.onToggleCollapse = this.onToggleCollapse.bind(this);
        this.onOrderChange = this.onOrderChange.bind(this);
        return this.state.xyTree.length ? (
            <div className="scrollable" style={{ height: this.props.style.height }}>
                <EntryTree
                    entries={this.state.xyTree}
                    showCheckboxes={true}
                    collapsedNodes={this.state.collapsedNodes}
                    checkedSeries={this.state.checkedSeries}
                    onToggleCheck={this.onToggleCheck}
                    onToggleCollapse={this.onToggleCollapse}
                    onOrderChange={this.onOrderChange}
                    headers={this.state.columns}
                />
            </div>
        ) : undefined;
    }

    renderYAxis(): React.ReactNode {
        // Y axis with D3
        const chartHeight = parseInt(this.props.style.height.toString());

        const yScale = scaleLinear()
            .domain([this.state.allMin, Math.max(this.state.allMax, 1)])
            .range([chartHeight - this.margin.bottom, this.margin.top]);

        const yTransform = `translate(${this.margin.left}, 0)`;

        // Abbreviate large numbers
        const scaleYLabel = (d: number) =>
            d >= 1000000000000
                ? Math.round(d / 100000000000) / 10 + 'G'
                : d >= 1000000000
                ? Math.round(d / 100000000) / 10 + 'B'
                : d >= 1000000
                ? Math.round(d / 100000) / 10 + 'M'
                : d >= 1000
                ? Math.round(d / 100) / 10 + 'K'
                : Math.round(d * 10) / 10;

        if (this.state.allMax > 0) {
            select(this.yAxisRef.current)
                .call(axisLeft(yScale).tickSizeOuter(0).ticks(4))
                .call(g => g.select('.domain').remove());
            select(this.yAxisRef.current)
                .selectAll('.tick text')
                .style('font-size', '11px')
                .text((d: any) => scaleYLabel(d));
        }

        return (
            <React.Fragment>
                <svg height={chartHeight} width={this.margin.left}>
                    <g className="y-axis" ref={this.yAxisRef} transform={yTransform} />
                </svg>
            </React.Fragment>
        );
    }

    resultsAreEmpty(): boolean {
        return this.state.xyTree.length === 0;
    }

    setFocus(): void {
        if (document.getElementById(this.getOutputComponentDomId() + 'focusContainer')) {
            document.getElementById(this.getOutputComponentDomId() + 'focusContainer')?.focus();
        } else {
            document.getElementById(this.getOutputComponentDomId())?.focus();
        }
    }

    protected chooseChart(): JSX.Element {
        const param: XYChartFactoryParams = {
            viewRange: this.getDisplayedRange(),
            allMax: this.state.allMax,
            allMin: this.state.allMin,
            isScatterPlot: this.isScatterPlot
        };

        const chartOptions: ChartOptions = xyChartFactory(param);

        if (!this.isScatterPlot) {
            return (
                <Line
                    data={this.state.xyData}
                    height={parseInt(this.props.style.height.toString())}
                    options={chartOptions}
                    ref={this.chartRef}
                    plugins={[this.plugin]}
                />
            );
        }

        return (
            <Scatter
                data={this.state.xyData}
                height={parseInt(this.props.style.height.toString())}
                options={chartOptions}
                ref={this.chartRef}
                plugins={[this.plugin]}
            />
        );
    }

    private async updateXY(): Promise<void> {
        let start = BigInt(0);
        let end = BigInt(0);
        const viewRange = this.getDisplayedRange();
        if (viewRange) {
            start = viewRange.getStart();
            end = viewRange.getEnd();
        }

        const xyDataParameters = QueryHelper.selectionTimeRangeQuery(
            start,
            end,
            this.getChartWidth(),
            this.state.checkedSeries
        );

        const tspClientResponse = await this.props.tspClient.fetchXY(
            this.props.traceId,
            this.props.outputDescriptor.id,
            xyDataParameters
        );
        const xyDataResponse = tspClientResponse.getModel();
        if (tspClientResponse.isOk() && xyDataResponse?.model?.series) {
            const series = xyDataResponse.model.series;
            if (series.length !== 0 && series[0].style) {
                // Rely on type set for the first series to conclude for all series, if many.
                // This is because support for per-series (potentially varying) type is lacking across-
                this.isScatterPlot = series[0].style.values['series-type'] === 'scatter';
            }
            if (this.isScatterPlot) {
                this.buildScatterData(series);
            } else {
                this.buildXYData(series);
            }
        }
    }

    private viewSpinner(status: boolean): void {
        if (document.getElementById(this.getOutputComponentDomId() + 'handleSpinner')) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            document.getElementById(this.getOutputComponentDomId() + 'handleSpinner')!.style.visibility = status
                ? 'visible'
                : 'hidden';
        }
    }

    private buildScatterData(seriesObj: XYSeries[]) {
        const dataSetArray = new Array<any>();
        let xValues: bigint[] = [];
        const offset = this.props.viewRange.getOffset() ?? BigInt(0);
        seriesObj.forEach(series => {
            const color = this.getSeriesColor(series.seriesName);
            xValues = series.xValues;
            const yValues: number[] = series.yValues;
            let pairs: xyPair[] = [];

            xValues.forEach((value, index) => {
                const adjusted = Number(value - offset);
                pairs.push(new xyPair(adjusted, yValues[index]));
            });

            const process: Entry[] = this.state.xyTree.filter(element => element.id === series.seriesId);

            dataSetArray.push({
                label: process[0].labels[0],
                data: pairs,
                backgroundColor: color,
                borderColor: color,
                showLine: false,
                fill: false
            });
            pairs = [];
        });

        const scatterData = {
            labels: xValues,
            datasets: dataSetArray
        };

        // flushSync: force immediate state update instead of waiting for React 18's automatic batching
        flushSync(() => {
            this.setState({ xyData: scatterData });
        });

        this.calculateYRange();
    }

    private buildXYData(seriesObj: XYSeries[]) {
        const dataSetArray = new Array<any>();
        let xValues: bigint[] = [];
        seriesObj.forEach(series => {
            const color = this.getSeriesColor(series.seriesName);
            xValues = series.xValues;
            dataSetArray.push({
                label: series.seriesName,
                fill: false,
                borderColor: color,
                backgroundColor: color,
                borderWidth: 2,
                data: series.yValues
            });
        });
        const lineData = {
            labels: xValues,
            datasets: dataSetArray
        };

        // flushSync: force immediate state update instead of waiting for React 18's automatic batching
        flushSync(() => {
            this.setState({ xyData: lineData });
        });

        this.calculateYRange();
    }

    private getSeriesColor(key: string): string {
        const colors = [
            'rgba(191, 33, 30, 1)',
            'rgba(30, 56, 136, 1)',
            'rgba(71, 168, 189, 1)',
            'rgba(245, 230, 99, 1)',
            'rgba(255, 173, 105, 1)',
            'rgba(216, 219, 226, 1)',
            'rgba(212, 81, 19, 1)',
            'rgba(187, 155, 176  , 1)',
            'rgba(6, 214, 160, 1)',
            'rgba(239, 71, 111, 1)'
        ];
        let colorIndex = this.colorMap.get(key);
        if (colorIndex === undefined) {
            colorIndex = this.currentColorIndex % colors.length;
            this.colorMap.set(key, colorIndex);
            this.currentColorIndex++;
        }
        return colors[colorIndex];
    }

    private calculateYRange() {
        let localMax = 0;
        let localMin = 0;

        if (this.state && this.state.xyData) {
            this.state.xyData?.datasets?.forEach((dSet: any, i: number) => {
                let rowMax;
                let rowMin;
                if (this.isScatterPlot) {
                    rowMax = Math.max(...dSet.data.map((d: any) => d.y));
                    rowMin = Math.min(...dSet.data.map((d: any) => d.y));
                } else {
                    rowMax = Math.max(...dSet.data);
                    rowMin = Math.min(...dSet.data);
                }
                localMax = Math.max(localMax, rowMax);
                localMin = i === 0 ? rowMin : Math.min(localMin, rowMin);
            });
        }

        this.setState({
            allMax: localMax * 1.01,
            allMin: localMin * 0.99
        });
    }

    protected getTimeForX(x: number): bigint {
        const range = this.getDisplayedRange();
        const offset = range.getOffset() ?? BigInt(0);
        const duration = range.getDuration();
        const chartWidth = this.getChartWidth() === 0 ? 1 : this.getChartWidth();
        const time = range.getStart() - offset + BIMath.round((x / chartWidth) * Number(duration));
        return time;
    }

    protected getXForTime(time: bigint): number {
        const range = this.getDisplayedRange();
        const start = range.getStart();
        const duration = range.getDuration();
        const chartWidth = this.getChartWidth() === 0 ? 1 : this.getChartWidth();
        const x = (Number(time - start) / Number(duration)) * chartWidth;
        return x;
    }

    protected zoom(isZoomIn: boolean): void {
        if (this.props.unitController.viewRangeLength >= 1) {
            const zoomCenterTime = this.getZoomTime();
            const startDistance = zoomCenterTime - this.props.unitController.viewRange.start;
            const zoomFactor = isZoomIn ? ZOOM_IN_RATE : ZOOM_OUT_RATE;
            const newDuration = BIMath.clamp(
                Number(this.props.unitController.viewRangeLength) * zoomFactor,
                BigInt(2),
                this.props.unitController.absoluteRange
            );
            const newStartRange = BIMath.max(0, zoomCenterTime - BIMath.round(Number(startDistance) * zoomFactor));
            const newEndRange = newStartRange + newDuration;
            this.updateRange(newStartRange, newEndRange);
        }
    }

    protected pan(panLeft: boolean): void {
        const panFactor = 0.1;
        const percentRange = BIMath.round(Number(this.props.unitController.viewRangeLength) * panFactor);
        const panNumber = panLeft ? BigInt(-1) : BigInt(1);
        const startRange = this.props.unitController.viewRange.start + panNumber * percentRange;
        const endRange = this.props.unitController.viewRange.end + panNumber * percentRange;
        if (startRange < 0) {
            this.props.unitController.viewRange = {
                start: BigInt(0),
                end: this.props.unitController.viewRangeLength
            };
        } else if (endRange > this.props.unitController.absoluteRange) {
            this.props.unitController.viewRange = {
                start: this.props.unitController.absoluteRange - this.props.unitController.viewRangeLength,
                end: this.props.unitController.absoluteRange
            };
        } else {
            this.props.unitController.viewRange = {
                start: startRange,
                end: endRange
            };
        }
    }

    protected tooltip(x: number, y: number): void {
        const xPos = this.positionXMove;
        const timeForX = this.getTimeForX(xPos);
        let timeLabel: string | undefined = timeForX.toString();
        if (this.props.unitController.numberTranslator) {
            timeLabel = this.props.unitController.numberTranslator(timeForX);
        }
        const chartWidth = this.isBarPlot ? this.getChartWidth() : this.chartRef.current.chartInstance.width;
        const chartHeight = this.isBarPlot
            ? parseInt(this.props.style.height.toString())
            : this.chartRef.current.chartInstance.height;
        const arraySize = this.state.xyData.labels.length;
        const index = Math.max(Math.round((xPos / chartWidth) * (arraySize - 1)), 0);
        const points: any = [];
        let zeros = 0;

        this.state.xyData.datasets.forEach((d: any) => {
            let yValue = 0;
            let xValue = 0;
            let invalidPoint = false;
            if (this.isScatterPlot) {
                if (d.data.length > 0) {
                    const getClosestPointParam: GetClosestPointParam = {
                        dataPoints: d.data,
                        mousePosition: {
                            x: this.positionXMove,
                            y: this.positionYMove
                        },
                        chartWidth: chartWidth,
                        chartHeight: chartHeight,
                        range: this.getDisplayedRange(),
                        margin: this.margin,
                        allMax: this.state.allMax,
                        allMin: this.state.allMin
                    };

                    // Find the data point that is the closest to the mouse position
                    const closest = getClosestPointForScatterPlot(getClosestPointParam);

                    if (closest !== undefined) {
                        yValue = closest.y;
                        xValue = closest.x;
                    } else {
                        invalidPoint = true; // Too far from mouse
                    }
                } else {
                    invalidPoint = true; // Series without any data
                }
            } else {
                // In case there are less data points than pixels in the chart,
                // calculate nearest value.
                yValue = d.data[index];
            }
            const rounded: number = isNaN(yValue) ? 0 : Math.round(Number(yValue) * 100) / 100;
            let formatted: string = new Intl.NumberFormat().format(rounded);

            if (this.isScatterPlot && this.props.unitController.numberTranslator) {
                const time = this.props.unitController.numberTranslator(BigInt(xValue));
                formatted = '(' + time + ') ' + formatted;
                timeLabel = 'Series (time stamp) value';
            }

            // If there are less than 10 lines in the chart, show all values, even if they are equal to 0.
            // If there are more than 10 lines in the chart, summarise the ones that are equal to 0.
            if (!invalidPoint) {
                if (this.state.xyData.datasets.length <= 10 || rounded > 0) {
                    const point: any = {
                        label: d.label,
                        color: d.borderColor,
                        background: d.backgroundColor,
                        value: formatted
                    };
                    points.push(point);
                } else if (!this.isScatterPlot) {
                    zeros += 1;
                }
            }
        });
        // Sort in decreasing order
        points.sort((a: any, b: any) => Number(b.value) - Number(a.value));

        // Adjust tooltip position if mouse is too close to the bottom of the window
        let topPos = undefined;
        let bottomPos = undefined;
        if (y > window.innerHeight - 350) {
            bottomPos = window.innerHeight - y;
        } else {
            topPos = window.pageYOffset + y - 40;
        }

        // Adjust tooltip position if mouse is too close to the left edge of the chart
        let leftPos = undefined;
        let rightPos = undefined;
        const xLocation = chartWidth - xPos;
        if (xLocation > chartWidth * 0.8) {
            leftPos = x - this.props.style.componentLeft;
        } else {
            rightPos = xLocation;
        }

        const tooltipData = {
            title: timeLabel,
            dataPoints: points,
            top: topPos,
            bottom: bottomPos,
            right: rightPos,
            left: leftPos,
            opacity: 1,
            zeros
        };

        if (points.length > 0) {
            this.props.tooltipXYComponent?.setElement(tooltipData);
        } else {
            this.hideTooltip();
        }
    }

    protected hideTooltip(): void {
        this.props.tooltipXYComponent?.setElement({
            opacity: 0
        });
    }
}
