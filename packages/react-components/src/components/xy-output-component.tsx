/* eslint-disable @typescript-eslint/no-explicit-any */
import { AbstractOutputProps, AbstractOutputState } from './abstract-output-component';
import { AbstractTreeOutputComponent } from './abstract-tree-output-component';
import * as React from 'react';
import { Line } from 'react-chartjs-2';
import {Scatter} from 'react-chartjs-2';
import { QueryHelper } from 'tsp-typescript-client/lib/models/query/query-helper';
import { Entry } from 'tsp-typescript-client/lib/models/entry';
import { ResponseStatus } from 'tsp-typescript-client/lib/models/response/responses';
import { XYSeries } from 'tsp-typescript-client/lib/models/xy';
import Chart = require('chart.js');
import { EntryTree } from './utils/filtrer-tree/entry-tree';
import { getAllExpandedNodeIds } from './utils/filtrer-tree/utils';
import { TreeNode } from './utils/filtrer-tree/tree-node';
import ColumnHeader from './utils/filtrer-tree/column-header';
import { ChangeEvent } from 'react';

type XYOuputState = AbstractOutputState & {
    selectedSeriesId: number[];
    xyTree: Entry[];
    checkedSeries: number[];
    collapsedNodes: number[];
    orderedNodes: number[];
    chartStyle: any;
    // FIXME Type this properly
    xyData: any;
    columns: ColumnHeader[];
};

class xyPair {
    x: number;
    y: number;
    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
      }
}

export class XYOutputComponent extends AbstractTreeOutputComponent<AbstractOutputProps, XYOuputState> {
    private currentColorIndex = 0;
    private colorMap: Map<string, number> = new Map();

    protected desiredChartStyle: any;
    private chartRef: any;
    private mouseIsDown = false;
    private posPixelSelect = 0;
    private plugin = {
        afterDraw: (chartInstance: Chart, _easing: Chart.Easing, _options?: any) => { this.afterChartDraw(chartInstance); }
    };
    private updateSelection = (event: MouseEvent) => {
        if (this.mouseIsDown && this.props.unitController.selectionRange) {
            const xStartPos = this.props.unitController.selectionRange.start;
            const scale = this.props.viewRange.getEnd() - this.props.viewRange.getstart();
            this.props.unitController.selectionRange = {
                start: xStartPos,
                end: xStartPos + ((event.screenX - this.posPixelSelect) / this.chartRef.current.chartInstance.width) * scale
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
            chartStyle: 'line',
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
        this.chartRef = React.createRef();
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
        if (this.chartRef.current) {
            this.chartRef.current.chartInstance.render();
        }
    }

    synchronizeTreeScroll(): void { /* Nothing to do by default */ }

    changeChartStyle(e: ChangeEvent<HTMLSelectElement>): void {
        const value = e.target.value.toString();
        this.desiredChartStyle = value;
        this.updateXY()
            .then(() => {
                this.setState({chartStyle:value});
            });
      }

    renderTree(): React.ReactNode | undefined {
        this.onToggleCheck = this.onToggleCheck.bind(this);
        this.onToggleCollapse = this.onToggleCollapse.bind(this);
        this.onOrderChange = this.onOrderChange.bind(this);
        return this.state.xyTree.length
            ? <>
            <select
            className="theia-select"
            value={this.state.chartStyle}
            onChange={
                e => this.changeChartStyle(e)
            }
            id="xy-dropdown"
            >
                <option value="line">Line</option>
                <option value="scatter">Scatter</option>
                <option value="area">Stacked Area</option>
            </select>
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
            </>
            : undefined
            ;
    }

    chooseChart(): React.ReactNode {

        const lineOptions: Chart.ChartOptions = {
            responsive: true,
            elements: {
                point: { radius: 0 },
                line: { tension: 0,
                        borderWidth: 2
                    }
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
                yAxes: [{
                    display: false,
                    stacked: false
                    }]
            },
            animation: { duration: 0 },
            events: [ 'mousedown' ],
        };

        const areaOptions: Chart.ChartOptions = {
              responsive: true,
              elements: {
                point: { radius: 0 },
                line: { tension: 0,
                        borderWidth: 0
                }
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
                xAxes: [{
                    id: 'time-axis',
                    display: false
                }],
                yAxes: [{
                  stacked: true,
                  display: false
                }]
              },
              animation: { duration: 0 },
              events: [ 'mousedown' ],
            };

        const scatterOptions: Chart.ChartOptions = {
            responsive: true,
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
              xAxes: [{
                  id: 'time-axis',
                  display: false,
                  ticks: {
                    min: this.props.viewRange?.getstart(),
                    max: this.props.viewRange?.getEnd()
                  }
                }],
              yAxes: [
                {
                  display: false,
                },
              ],
            },
            animation: { duration: 0 },
            events: [ 'mousedown' ]
          };

          switch (this.state.chartStyle) {
            case 'scatter':
                return <Scatter
                data={this.state.xyData}
                height={parseInt(this.props.style.height.toString())}
                options={scatterOptions}
                ref={this.chartRef}
                plugins={[this.plugin]}
                >
                </Scatter>;
            case 'area':
                return <Line
                data={this.state.xyData}
                height={parseInt(this.props.style.height.toString())}
                options={areaOptions}
                ref={this.chartRef}
                plugins={[this.plugin]}
                >
                </Line>;
            case 'line':
                return <Line
                data={this.state.xyData}
                height={parseInt(this.props.style.height.toString())}
                options={lineOptions}
                ref={this.chartRef}
                plugins={[this.plugin]}
                >
                </Line>;
          }

    }

    renderChart(): React.ReactNode {
        // width={this.props.style.chartWidth}
        return <React.Fragment>
            {this.state.outputStatus === ResponseStatus.COMPLETED ?
                <div id='xy-main' onMouseDown={event => this.beginSelection(event)} style={{ height: this.props.style.height }} >
                    {this.chooseChart()}
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

    private beginSelection(event: React.MouseEvent<HTMLDivElement, MouseEvent>) {
        this.mouseIsDown = true;
        this.posPixelSelect = event.nativeEvent.screenX;
        const offset = this.props.viewRange.getOffset() ?? 0;
        const scale = this.props.viewRange.getEnd() - this.props.viewRange.getstart();
        const xPos = this.props.viewRange.getstart() - offset +
            (event.nativeEvent.offsetX / this.chartRef.current.chartInstance.width) * scale;
        this.props.unitController.selectionRange = {
            start: xPos,
            end: xPos
        };
        document.addEventListener('mousemove', this.updateSelection);
        document.addEventListener('mouseup', this.endSelection);
    }

    private async updateXY(): Promise<void> {
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
            switch (this.desiredChartStyle) {
                case 'scatter':
                    this.buildScatterData(xyDataResponse.model.series);
                    break;
                case 'area':
                    this.buildAreaData(xyDataResponse.model.series);
                    break;
                case 'line':
                    this.buildLineData(xyDataResponse.model.series);
                    break;
                default:
                    this.buildLineData(xyDataResponse.model.series);
                    break;
            }
        }
    }

    private buildScatterData(seriesObj: XYSeries[]) {
        const dataSetArray = new Array<any>();
        let xValues: number[] = [];
        let yValues: number[] = [];
        let pairs: xyPair[] = [];
        seriesObj.forEach(series => {
            const color = this.getSeriesColor(series.seriesName);
            xValues = series.xValues;
            yValues = series.yValues;

            xValues.forEach((value, index) => {
                pairs.push(new xyPair(value, yValues[index]));
            });

            dataSetArray.push({
                label: series.seriesName,
                data: pairs,
                backgroundColor: color,
                borderColor: color,
            });
            pairs = [];
        });
        const scatterData = {
            labels: xValues,
            datasets: dataSetArray
        };

        this.setState({
            xyData: scatterData
        });
    }

    private buildAreaData(seriesObj: XYSeries[]) {
        const dataSetArray = new Array<any>();
        let xValues: number[] = [];
        seriesObj.forEach(series => {
            const color = this.getSeriesColor(series.seriesName);
            xValues = series.xValues;
            dataSetArray.push({
                label: series.seriesName,
                fill: 'start',
                backgroundColor: color,
                data: series.yValues
            });
        });
        dataSetArray.shift();
        const areaData = {
            labels: xValues,
            datasets: dataSetArray
        };

        this.setState({
            xyData: areaData
        });
    }

    private buildLineData(seriesObj: XYSeries[]) {
        const dataSetArray = new Array<any>();
        let xValues: number[] = [];
        seriesObj.forEach(series => {
            const color = this.getSeriesColor(series.seriesName);
            xValues = series.xValues;
            dataSetArray.push({
                label: series.seriesName,
                fill: false,
                borderColor: color,
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
