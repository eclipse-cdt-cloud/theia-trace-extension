/* eslint-disable @typescript-eslint/no-explicit-any */
import { AbstractOutputProps, AbstractOutputState } from './abstract-output-component';
import { AbstractTreeOutputComponent } from './abstract-tree-output-component';
import * as React from 'react';
import { Line } from 'react-chartjs-2';
import { QueryHelper } from 'tsp-typescript-client/lib/models/query/query-helper';
import { Entry } from 'tsp-typescript-client/lib/models/entry';
import { ResponseStatus } from 'tsp-typescript-client/lib/models/response/responses';
import { XYSeries } from 'tsp-typescript-client/lib/models/xy';
import Chart = require('chart.js');
import { EntryTree } from './utils/filtrer-tree/entry-tree';
import { getAllExpandedNodeIds } from './utils/filtrer-tree/utils';
import { TreeNode } from './utils/filtrer-tree/tree-node';
import ColumnHeader from './utils/filtrer-tree/column-header';

type XYOuputState = AbstractOutputState & {
    selectedSeriesId: number[];
    xyTree: Entry[];
    checkedSeries: number[];
    collapsedNodes: number[];
    orderedNodes: number[];
    // FIXME Type this properly
    xyData: any;
    columns: ColumnHeader[];
};
const ZOOM_IN = true;
const ZOOM_OUT = false;
const PAN_LEFT = true;
const PAN_RIGHT = false;

export class XYOutputComponent extends AbstractTreeOutputComponent<AbstractOutputProps, XYOuputState> {
    private currentColorIndex = 0;
    private colorMap: Map<string, number> = new Map();
    private lineChartRef: any;
    private mouseIsDown = false;
    private positionXMove = 0;
    private posPixelSelect = 0;
    private plugin = {
        afterDraw: (chartInstance: Chart, _easing: Chart.Easing, _options?: any) => { this.afterChartDraw(chartInstance); }
    };
    private updateSelection = (event: MouseEvent) => {
        if (this.mouseIsDown && this.props.unitController.selectionRange) {
            const xStartPos = this.props.unitController.selectionRange.start;
            const scale = this.props.viewRange.getEnd() - this.props.viewRange.getstart();
            let end = xStartPos + ((event.screenX - this.posPixelSelect) / this.lineChartRef.current.chartInstance.width) * scale;
            end = Math.min(Math.max(end, 0), this.props.unitController.absoluteRange);
            this.props.unitController.selectionRange = {
                start: xStartPos,
                end: end
            };
        }
    };

    private endSelection = () => {
        this.mouseIsDown = false;
        document.removeEventListener('mousemove', this.updateSelection);
        document.removeEventListener('mouseup', this.endSelection);
    };

    constructor(props: AbstractOutputProps) {
        super(props);
        this.state = {
            outputStatus: ResponseStatus.RUNNING,
            selectedSeriesId: [],
            xyTree: [],
            checkedSeries: [],
            collapsedNodes: [],
            orderedNodes: [],
            xyData: {},
            columns: [{title: 'Name', sortable: true}]
        };

        this.afterChartDraw = this.afterChartDraw.bind(this);
        this.lineChartRef = React.createRef();
    }

    componentDidMount(): void {
        this.waitAnalysisCompletion();
    }

    async fetchTree(): Promise<ResponseStatus> {
        const parameters = QueryHelper.timeQuery([this.props.range.getstart(), this.props.range.getEnd()]);
        const tspClientResponse = await this.props.tspClient.fetchXYTree(this.props.traceId, this.props.outputDescriptor.id, parameters);
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
                columns.push({title: 'Legend', sortable: false});
                this.setState({
                    outputStatus: treeResponse.status,
                    xyTree: treeResponse.model.entries,
                    columns
                });
            }
            return treeResponse.status;
        }
        return ResponseStatus.FAILED;
    }

    componentDidUpdate(prevProps: AbstractOutputProps, prevState: XYOuputState): void {
        const viewRangeChanged = this.props.viewRange !== prevProps.viewRange;
        const checkedSeriesChanged = this.state.checkedSeries !== prevState.checkedSeries;
        const collapsedNodesChanged = this.state.collapsedNodes !== prevState.collapsedNodes;
        const chartWidthChanged = this.props.style.chartWidth !== prevProps.style.chartWidth;
        const needToUpdate = viewRangeChanged || checkedSeriesChanged || collapsedNodesChanged || chartWidthChanged;
        if (needToUpdate || prevState.outputStatus === ResponseStatus.RUNNING) {
            this.updateXY();
        }
        if (this.lineChartRef.current) {
            this.lineChartRef.current.chartInstance.render();
        }
    }

    synchronizeTreeScroll(): void { /* Nothing to do by default */ }

    renderTree(): React.ReactNode | undefined {
        this.onToggleCheck = this.onToggleCheck.bind(this);
        this.onToggleCollapse = this.onToggleCollapse.bind(this);
        this.onOrderChange = this.onOrderChange.bind(this);
        return this.state.xyTree.length
            ? <EntryTree
                entries={this.state.xyTree}
                showCheckboxes={true}
                collapsedNodes={this.state.collapsedNodes}
                checkedSeries={this.state.checkedSeries}
                onToggleCheck={this.onToggleCheck}
                onToggleCollapse={this.onToggleCollapse}
                onOrderChange={this.onOrderChange}
                headers={this.state.columns}
            />
            : undefined
            ;
    }

    renderChart(): React.ReactNode {
        const lineOptions: Chart.ChartOptions = {
            responsive: true,
            elements: {
                point: { radius: 0 },
                line: { tension: 0 }
            },
            maintainAspectRatio: false,
            legend: { display: false },
            layout: {
                padding: {
                    left: 0,
                    right: 0,
                    top: 15,
                    bottom: 5
                }
            },
            scales: {
                xAxes: [{ id: 'time-axis', display: false }],
                yAxes: [{ display: false }]
            },
            animation: { duration: 0 },
            events: [ 'mousedown' ],
        };
        // width={this.props.style.chartWidth}
        return <React.Fragment>
            {this.state.outputStatus === ResponseStatus.COMPLETED ?
                <div id='xy-main' tabIndex={0}
                    onKeyDown={event => this.onKeyDown(event)}
                    onWheel={event => this.onWheel(event)}
                    onMouseMove={event => this.onMouseMove(event)}
                    onMouseDown={event => this.onMouseDown(event)}
                    style={{ height: this.props.style.height }}>
                    <Line
                        data={this.state.xyData}
                        height={parseInt(this.props.style.height.toString())}
                        options={lineOptions}
                        ref={this.lineChartRef}
                        plugins={[this.plugin]}>
                    </Line>
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
                </div>}
        </React.Fragment>;
    }

    private afterChartDraw(chart: Chart) {
        const ctx = chart.ctx;
        const xScale = (chart as any).scales['time-axis'];
        const ticks: number[] = xScale.ticks;
        if (ctx && this.props.selectionRange) {
            const min = Math.min(this.props.selectionRange.getstart(), this.props.selectionRange.getEnd());
            const max = Math.max(this.props.selectionRange.getstart(), this.props.selectionRange.getEnd());
            // If the selection is out of range
            if (min > this.props.viewRange.getEnd() || max < this.props.viewRange.getstart()) {
                return;
            }
            const minValue = this.findNearestValue(min, ticks);
            const minPixel = xScale.getPixelForValue(min, minValue);
            const maxValue = this.findNearestValue(max, ticks);
            let maxPixel = xScale.getPixelForValue(max, maxValue);
            // In the case the selection is going out of bounds, the pixelValue needs to be in the displayed range.
            if (maxPixel === 0) {
                maxPixel = chart.chartArea.right;
            }
            ctx.save();

            ctx.lineWidth = 1;
            ctx.strokeStyle = '#259fd8';
            // Selection borders
            if (min > this.props.viewRange.getstart()) {
                ctx.beginPath();
                ctx.moveTo(minPixel, 0);
                ctx.lineTo(minPixel, chart.chartArea.bottom);
                ctx.stroke();
            }
            if (max < this.props.viewRange.getEnd()) {
                ctx.beginPath();
                ctx.moveTo(maxPixel, 0);
                ctx.lineTo(maxPixel, chart.chartArea.bottom);
                ctx.stroke();
            }
            // Selection fill
            ctx.globalAlpha = 0.2;
            ctx.fillStyle = '#259fd8';
            ctx.fillRect(minPixel, 0, maxPixel - minPixel, chart.chartArea.bottom);

            ctx.restore();
        }
    }

    private findNearestValue(value: number, ticks: number[]): number {
        let nearestIndex: number | undefined = undefined;
        ticks.forEach((tick, index) => {
            if (tick >= value) {
                if (!nearestIndex) {
                    nearestIndex = index;
                }
            }
        });
        return nearestIndex ? nearestIndex : 0;
    }

    private onToggleCheck(ids: number[]) {
        let newList = [...this.state.checkedSeries];
        ids.forEach(id => {
            const exist = this.state.checkedSeries.find(seriesId => seriesId === id);

            if (exist !== undefined) {
                newList = newList.filter(series => id !== series);
            } else {
                newList = newList.concat(id);
            }
        });
        this.setState({checkedSeries: newList});
    }

    private onToggleCollapse(id: number, nodes: TreeNode[]) {
        let newList = [...this.state.collapsedNodes];

        const exist = this.state.collapsedNodes.find(expandId => expandId === id);

        if (exist !== undefined) {
            newList = newList.filter(collapsed => id !== collapsed);
        } else {
            newList = newList.concat(id);
        }
        const orderedIds = getAllExpandedNodeIds(nodes, newList);
        this.setState({collapsedNodes: newList, orderedNodes: orderedIds});
    }

    private onOrderChange(ids: number[]) {
        this.setState({orderedNodes: ids});
    }

    private onMouseDown(event: React.MouseEvent<HTMLDivElement, MouseEvent>) {
        this.mouseIsDown = true;
        this.posPixelSelect = event.nativeEvent.screenX;
        const startTime = this.getTimeX(event.nativeEvent.offsetX);
        this.props.unitController.selectionRange = {
            start: startTime,
            end: startTime
        };
        document.addEventListener('mousemove', this.updateSelection);
        document.addEventListener('mouseup', this.endSelection);
    }

    private updateRange(rangeStart: number, rangeEnd: number) {
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

    private zoom(isZoomIn: boolean) {
        if (this.props.unitController.viewRangeLength >= 1) {
            let newStartRange = 0;
            let newEndRange = 0;
            const percentZoom = 0.9;
            const position = this.getTimeX(this.positionXMove);
            const startDistance  = position - this.props.unitController.viewRange.start;
            const endDistance = this.props.unitController.viewRange.end - position;
            const zoomFactor = isZoomIn ? percentZoom : 1 / percentZoom;
            newStartRange = position - startDistance * zoomFactor;
            newEndRange = position + endDistance * zoomFactor;
            if (newStartRange < 0) {
                newEndRange = newEndRange - newStartRange;
            } else if (newEndRange > this.props.unitController.absoluteRange) {
                const delta = newEndRange - this.props.unitController.absoluteRange;
                newStartRange = newStartRange - delta;
            }
            newStartRange = Math.max(newStartRange, 0);
            newEndRange = Math.min(newEndRange, this.props.unitController.absoluteRange);
            this.updateRange(newStartRange, newEndRange);
        }
    }

    private pan(panLeft: boolean) {
        const panFactor = 0.1;
        const percentRange = this.props.unitController.viewRangeLength * panFactor;
        const panNumber = panLeft ? -1 : 1;
        const startRange = this.props.unitController.viewRange.start + (panNumber * percentRange);
        const endRange = this.props.unitController.viewRange.end + (panNumber * percentRange);
        if (startRange < 0) {
            this.props.unitController.viewRange = {
                start: 0,
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

    private onWheel(wheel: React.WheelEvent) {
        if (wheel.shiftKey) {
            if (wheel.deltaY < 0) {
                this.pan(PAN_LEFT);
            }
            else if (wheel.deltaY > 0) {
                this.pan(PAN_RIGHT);
            }
        }
    }

    private getTimeX(event: number): number {
        const offset = this.props.viewRange.getOffset() ?? 0;
        const scale = this.props.viewRange.getEnd() - this.props.viewRange.getstart();
        const xPos = this.props.viewRange.getstart() - offset +
            (event / this.lineChartRef.current.chartInstance.width) * scale;
        return xPos;
    }

    private onMouseMove(event: React.MouseEvent) {
        this.positionXMove = event.nativeEvent.offsetX;
    }

    private onKeyDown(key: React.KeyboardEvent) {
        switch (key.key) {
            case 'W':
            case 'w': {
                this.zoom(ZOOM_IN);
                break;
            }
            case 'S':
            case 's': {
                this.zoom(ZOOM_OUT);
                break;
            }
            case 'A':
            case 'a':
            case 'ArrowLeft': {
                this.pan(PAN_LEFT);
                break;
            }
            case 'D':
            case 'd':
            case 'ArrowRight': {
                this.pan(PAN_RIGHT);
                break;
            }
        }
    }

    private async updateXY() {
        let start = 1332170682440133097;
        let end = 1332170682540133097;
        const viewRange = this.props.viewRange;
        if (viewRange) {
            start = viewRange.getstart();
            end = viewRange.getEnd();
        }

        const xyDataParameters = QueryHelper.selectionTimeQuery(
            QueryHelper.splitRangeIntoEqualParts(Math.trunc(start), Math.trunc(end), this.props.style.chartWidth), this.state.checkedSeries);

        const tspClientResponse = await this.props.tspClient.fetchXY(this.props.traceId, this.props.outputDescriptor.id, xyDataParameters);
        const xyDataResponse = tspClientResponse.getModel();
        if (tspClientResponse.isOk() && xyDataResponse) {
            this.buildXYData(xyDataResponse.model.series);
        }
    }

    private buildXYData(seriesObj: XYSeries[]) {
        const dataSetArray = new Array<any>();
        let xValues: number[] = [];
        seriesObj.forEach(series => {
            const color = this.getSeriesColor(series.seriesName);
            xValues = series.xValues;
            dataSetArray.push({
                label: series.seriesName,
                fill: false,
                borderColor: color,
                borderWidth: 2,
                data: series.yValues
            });
        });
        const lineData = {
            labels: xValues,
            datasets: dataSetArray
        };

        this.setState({
            xyData: lineData
        });
    }

    private getSeriesColor(key: string): string {
        const colors = ['rgba(191, 33, 30, 1)', 'rgba(30, 56, 136, 1)', 'rgba(71, 168, 189, 1)', 'rgba(245, 230, 99, 1)', 'rgba(255, 173, 105, 1)',
            'rgba(216, 219, 226, 1)', 'rgba(212, 81, 19, 1)', 'rgba(187, 155, 176  , 1)', 'rgba(6, 214, 160, 1)', 'rgba(239, 71, 111, 1)'];
        let colorIndex = this.colorMap.get(key);
        if (colorIndex === undefined) {
            colorIndex = this.currentColorIndex % colors.length;
            this.colorMap.set(key, colorIndex);
            this.currentColorIndex++;
        }
        return colors[colorIndex];
    }
}
