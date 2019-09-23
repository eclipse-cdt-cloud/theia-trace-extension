import { AbstractOutputProps, AbstractOutputState } from "./abstract-output-component";
import { AbstractTreeOutputComponent } from './abstract-tree-output-component'
import * as React from 'react';
import { Line } from 'react-chartjs-2';
import { QueryHelper } from "tsp-typescript-client/lib/models/query/query-helper";
import { Entry, EntryHeader } from "tsp-typescript-client/lib/models/entry";
import { ResponseStatus } from "tsp-typescript-client/lib/models/response/responses";
import { XYSeries } from "tsp-typescript-client/lib/models/xy";
import { CheckboxComponent } from '../components/utils/checkbox-component';
import Chart = require("chart.js");

type XYOuputState = AbstractOutputState & {
    selectedSeriesId: number[];
    XYTree: Entry[];
    checkedSeries: number[];
    XYData: any;
}

export class XYOutputComponent extends AbstractTreeOutputComponent<AbstractOutputProps, XYOuputState> {
    private currentColorIndex: number = 0;
    private colorMap: Map<string, number> = new Map();

    private lineChartRef: any;

    constructor(props: AbstractOutputProps) {
        super(props);
        this.state = {
            outputStatus: ResponseStatus.RUNNING,
            selectedSeriesId: [],
            XYTree: [],
            checkedSeries: [],
            XYData: {}
        }

        this.afterChartDraw = this.afterChartDraw.bind(this);
        Chart.pluginService.register({
            afterDraw: (chart, easing) => {
                this.afterChartDraw(chart);
            }
        });
        this.lineChartRef = React.createRef();
    }

    componentDidMount() {
        this.waitAnalysisCompletion();
    }

    componentDidUpdate(prevProps: AbstractOutputProps, prevState: XYOuputState) {
        const viewRangeChanged = this.props.viewRange !== prevProps.viewRange;
        const checkedSeriesChanged = this.state.checkedSeries !== prevState.checkedSeries;
        const needToUpdate = viewRangeChanged || checkedSeriesChanged || !this.state.XYData || !this.state.XYTree.length;
        if (needToUpdate && this.state.outputStatus === ResponseStatus.COMPLETED) {
            this.updateTree();
            this.updateXY();
        }
        if (prevProps.style.chartWidth !== this.props.style.chartWidth) {
            this.updateXY();
        }
        this.lineChartRef.current.chartInstance.render();
    }

    renderTree(): React.ReactNode {
        this.onSeriesChecked = this.onSeriesChecked.bind(this);
        return <React.Fragment>
            {this.state.XYTree.map(entry => {
                return <CheckboxComponent key={entry.id}
                    id={entry.id}
                    name={entry.labels[0]}
                    checked={this.state.checkedSeries.find(id => entry.id === id) ? true : false}
                    onChecked={this.onSeriesChecked} />
            })}
        </React.Fragment>;
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
        };
        // width={this.props.style.chartWidth}
        return <React.Fragment>
            {this.state.outputStatus === ResponseStatus.COMPLETED ?
                <Line data={this.state.XYData} height={this.props.style.height} options={lineOptions} ref={this.lineChartRef}></Line> :
                'Analysis running...'}
        </React.Fragment>;
    }

    private afterChartDraw(chart: Chart) {
        const ctx = chart.ctx;
        const xScale = (chart as any).scales['time-axis'];
        const ticks: number[] = xScale.ticks;
        if (ctx && this.props.selectionRange) {
            const valueStart = this.findNearestValue(this.props.selectionRange.getstart(), ticks);
            const valueEnd = this.findNearestValue(this.props.selectionRange.getEnd(), ticks);
            const pixelStart = xScale.getPixelForValue(this.props.selectionRange.getstart(), valueStart);
            const pixelEnd = xScale.getPixelForValue(this.props.selectionRange.getEnd(), valueEnd);
            ctx.save();

            ctx.lineWidth = 1;
            ctx.strokeStyle = '#259fd8';

            ctx.beginPath();
            ctx.moveTo(pixelStart, 0);
            ctx.lineTo(pixelStart, chart.chartArea.bottom);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(pixelEnd, 0);
            ctx.lineTo(pixelEnd, chart.chartArea.bottom);
            ctx.stroke();

            ctx.globalAlpha = 0.2;
            ctx.fillStyle = '#259fd8';
            ctx.fillRect(pixelStart, 0, pixelEnd - pixelStart, chart.chartArea.bottom);

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

    private onSeriesChecked(id: number) {
        const exist = this.state.checkedSeries.find(seriesId => {
            return seriesId === id;
        })

        if (exist) {
            this.setState(prevState => {
                const newList = prevState.checkedSeries.filter(series => {
                    return id !== series;
                });
                return {
                    checkedSeries: newList
                };
            });
        } else {
            this.setState(prevState => {
                return {
                    checkedSeries: prevState.checkedSeries.concat(id)
                }
            });
        }
    }

    // private async waitAnalysisCompletion() {
    //     const traceUUID = this.props.traceId;
    //     const tspClient = this.props.tspClient;
    //     const outPutId = this.props.outputDescriptor.id;

    //     // TODO Use the output descriptor to find out if the analysis is completed
    //     const xyTreeParameters = QueryHelper.selectionTimeQuery(
    //         QueryHelper.splitRangeIntoEqualParts(this.props.range.getstart(), this.props.range.getEnd(), 1120), []); // , [], { 'cpus': [] }
    //     let xyTreeResponse = (await tspClient.fetchXYTree<Entry, EntryHeader>(traceUUID, outPutId, xyTreeParameters)).getModel();
    //     while (xyTreeResponse.status === ResponseStatus.RUNNING) {
    //         xyTreeResponse = (await tspClient.fetchXYTree<Entry, EntryHeader>(traceUUID, outPutId, xyTreeParameters)).getModel();
    //     }
    //     this.setState({
    //         outputStatus: xyTreeResponse.status
    //     });
    // }

    private async updateTree() {
        // TODO Remove cpus parameters at some point. This is very specific to Trace Compass server
        const xyTreeParameters = QueryHelper.selectionTimeQuery(
            QueryHelper.splitRangeIntoEqualParts(this.props.range.getstart(), this.props.range.getEnd(), 1120), []); // , [], { 'cpus': [] }
        const xyTreeResponse = (await this.props.tspClient.fetchXYTree<Entry, EntryHeader>(this.props.traceId, this.props.outputDescriptor.id, xyTreeParameters)).getModel();
        let treeModel = xyTreeResponse.model;
        this.buildTreeNodes(treeModel.entries);
    }

    private async updateXY() {
        let start = 1332170682440133097;
        let end = 1332170682540133097;
        const viewRange = this.props.viewRange;
        if (viewRange) {
            start = viewRange.getstart();
            end = viewRange.getEnd();
        }

        // TODO Remove isCumulative parameters at some point. This is very specific to Trace Compass server
        const xyDataParameters = QueryHelper.selectionTimeQuery(
            QueryHelper.splitRangeIntoEqualParts(Math.trunc(start), Math.trunc(end), this.props.style.chartWidth), this.state.checkedSeries); // , [], { 'isCumulative': false }

        const xyDataResponse = (await this.props.tspClient.fetchXY(this.props.traceId, this.props.outputDescriptor.id, xyDataParameters)).getModel();
        // TODO Fix that, model is wrong, map are not working
        const cpuXY = xyDataResponse.model;
        const seriesObject = cpuXY.series;
        this.buildXYData(seriesObject);
    }

    private buildXYData(seriesObj: { [key: string]: XYSeries }) {
        const dataSetArray = new Array<any>();
        let xValues: any[] = [];
        Object.keys(seriesObj).forEach(key => {
            const series = seriesObj[key];
            const color = this.getSeriesColor(key);
            xValues = seriesObj[key].xValues
            dataSetArray.push({
                label: key,
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
            XYData: lineData
        });
    }

    private buildTreeNodes(flatTree: Entry[]) {
        let tree: any[] = flatTree;
        // Not the right way
        if (flatTree.length > 1) {
            tree = flatTree.filter(entry => {
                return entry.parentId !== -1;
            });
        }
        this.setState({
            XYTree: tree
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