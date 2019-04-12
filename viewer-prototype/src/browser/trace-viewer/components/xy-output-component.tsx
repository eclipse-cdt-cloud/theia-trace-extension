import { AbstractOutputComponent, AbstractOutputProps, AbstractOutputState } from "./abstract-output-component";
import * as React from 'react';
import { Line } from 'react-chartjs-2';
import { QueryHelper } from "tsp-typescript-client/lib/models/query/query-helper";
import { Entry, EntryHeader } from "tsp-typescript-client/lib/models/entry";
import { ResponseStatus } from "tsp-typescript-client/lib/models/response/responses";
import { XYSeries } from "tsp-typescript-client/lib/models/xy";
import { CheckboxComponent } from '../components/utils/checkbox-component'

type XYOuputState = AbstractOutputState & {
    selectedSeriesId: number[];
    XYTree: Entry[];
    checkedSeries: number[];
    XYData: any;
}

export class XYOutputComponent extends AbstractOutputComponent<AbstractOutputProps, XYOuputState> {
    constructor(props: AbstractOutputProps) {
        super(props);
        this.state = {
            outputStatus: ResponseStatus.RUNNING,
            selectedSeriesId: [],
            XYTree: [],
            checkedSeries: [],
            XYData: {}
        }
        // I don't like this, maybe there is an other way
        this.props.unitController.onViewRangeChanged(range => { this.updateXY() });
        this.updateXY();
    }

    renderMainArea(): React.ReactNode {
        const lineOptions: Chart.ChartOptions = {
            responsive: true,
            elements: { point: { radius: 0 } },
            maintainAspectRatio: false,
            legend: { display: false },
            layout: {
                padding: {
                    left: 0,
                    right: 0,
                    top: 15,
                    bottom: 15
                }
            },
            scales: { xAxes: [{ display: false }] }
        };

        this.onSeriesChecked = this.onSeriesChecked.bind(this);
        return <div className='xy-output-container'>
            <div className='xy-tree'>
                {this.state.XYTree.map(entry => {
                    return <CheckboxComponent key={entry.id}
                        id={entry.id}
                        name={(entry as any).labels[0]}
                        checked={this.state.checkedSeries.find(id => entry.id === id) ? true : false}
                        onChecked={this.onSeriesChecked} />
                })}
            </div>
            <div className='xy-chart'>
                {this.state.outputStatus === ResponseStatus.COMPLETED ? <Line data={this.state.XYData} height={300} options={lineOptions}></Line> : 'Analysis running...'}
            </div>
        </div>;
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

        this.updateXY();
    }

    private async updateXY() {
        const traceUUID = this.props.traceId;
        const tspClient = this.props.tspClient;
        const outPutId = this.props.outputDescriptor.id;

        // Check if analysis is done
        // FIXME Not sure this is the right way
        const xyTreeParameters = QueryHelper.selectionTimeQuery(
            QueryHelper.splitRangeIntoEqualParts(1332170682440133097, 1332170682540133097, 1120), [], [], { 'cpus': [] });
        let xyTreeResponse = await tspClient.fetchXYTree<Entry, EntryHeader>(traceUUID, outPutId, xyTreeParameters);
        while (xyTreeResponse.status === ResponseStatus.RUNNING) {
            xyTreeResponse = await tspClient.fetchXYTree<Entry, EntryHeader>(traceUUID, outPutId, xyTreeParameters);
        }

        let start = 1332170682440133097;
        let end = 1332170682540133097;
        const viewRange = this.props.viewRange;
        if (viewRange) {
            start = viewRange[0] + this.props.range[0];
            end = viewRange[1] + this.props.range[1];
        }

        let treeModel = xyTreeResponse.model;
        this.buildTreeNodes(treeModel.entries);
        const xyDataParameters = QueryHelper.selectionTimeQuery(
            QueryHelper.splitRangeIntoEqualParts(Math.trunc(start), Math.trunc(end), 1120), this.state.checkedSeries);

        const xyDataResponse = await tspClient.fetchXY(traceUUID, outPutId, xyDataParameters);

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
            const bValue = Math.floor(Math.random() * 76) + 180;
            const gValue = Math.floor(Math.random() * 76) + 180;
            const color = 'rgba(75,' + gValue.toString() + ',' + bValue.toString() + ',0.4)';
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
            outputStatus: ResponseStatus.COMPLETED,
            XYData: lineData
        });
    }

    private buildTreeNodes(flatTree: Entry[]) {
        const tree = flatTree.filter(entry => {
            return entry.id !== -1;
        });
        this.setState({
            XYTree: tree
        });
    }
}