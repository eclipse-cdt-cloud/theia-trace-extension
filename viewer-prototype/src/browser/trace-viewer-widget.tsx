/********************************************************************************
 * Copyright (C) 2018 Ericsson and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * This Source Code may also be made available under the following Secondary
 * Licenses when the conditions for such availability set forth in the Eclipse
 * Public License v. 2.0 are satisfied: GNU General Public License, version 2
 * with the GNU Classpath Exception which is available at
 * https://www.gnu.org/software/classpath/license.html.
 *
 * SPDX-License-Identifier: EPL-2.0 OR GPL-2.0 WITH Classpath-exception-2.0
 ********************************************************************************/

import { injectable, inject } from 'inversify';
import { Message } from '@theia/core/lib/browser';
import { ReactWidget } from '@theia/core/lib/browser/widgets/react-widget';
import * as React from 'react';
import { Path } from '@theia/core';
import { AgGridReact } from 'ag-grid-react';
import { Query } from 'tsp-typescript-client/lib/models/query/query';
import { TspClient } from 'tsp-typescript-client/lib/protocol/tsp-client';
import { TraceManager } from '../common/trace-manager';
import { Trace } from 'tsp-typescript-client/lib/models/trace';
import { Entry, EntryHeader } from 'tsp-typescript-client/lib/models/entry';
import { Line } from 'react-chartjs-2';
import { TimeGraphModel, TimeGraphEntry } from 'tsp-typescript-client/lib/models/timegraph';
import { XYSeries } from 'tsp-typescript-client/lib/models/xy';
import { ResponseStatus } from 'tsp-typescript-client/lib/models/response/responses';
import { QueryHelper } from 'tsp-typescript-client/lib/models/query/query-helper';

export const TraceViewerWidgetOptions = Symbol('TraceViewerWidgetOptions');
export interface TraceViewerWidgetOptions {
    traceURI: string;
}

@injectable()
export class TraceViewerWidget extends ReactWidget {

    static ID = 'trace-viewer';
    static LABEL = 'Trace Viewer';

    protected readonly uri: Path;
    // protected readonly resource: Resource;
    private traceManager: TraceManager;
    private tspClient: TspClient;
    private openedTrace: Trace | undefined;
    private traceInfoText: string = '';
    private tableColumns: Array<any> = new Array();
    private tableLines: Array<any> = new Array();

    private timeGraphTree: string = '';
    private timeGraphState: string = '';

    private XYData: object = {};
    private XYTree: string = '';

    private XYEntriesMap: Map<number, any> = new Map();

    constructor(
        @inject(TraceViewerWidgetOptions) protected readonly options: TraceViewerWidgetOptions
    ) {
        super();
        this.traceManager = TraceManager.getInstance();
        this.tspClient = new TspClient('http://localhost:8080/tsp/api');
        this.uri = new Path(this.options.traceURI);
        this.id = 'theia-traceOpen';
        this.title.label = 'Trace: ' + this.uri.base;
        this.title.closable = true;
        this.addClass('theia-trace-open');
        this.initialize();
    }

    async initialize(): Promise<void> {
        this.traceManager.openTrace(this.uri, this.uri.name).then(trace => {
            if (trace) {
                this.openedTrace = trace;
                this.traceInfoText = this.traceToString(trace);
                this.updateTraceInfo(trace);
                this.updateEventsTable();
            }
        });
        this.update();
    }

    onCloseRequest(msg: Message) {
        if (this.openedTrace) {
            this.traceManager.closeTrace(this.openedTrace, this.uri);
        }
        super.onCloseRequest(msg);
    }

    protected render(): React.ReactNode {
        this.handleHistogramXY = this.handleHistogramXY.bind(this);
        this.handleResourcesTimeGraph = this.handleResourcesTimeGraph.bind(this);
        this.handleCpuXY = this.handleCpuXY.bind(this);
        return <div className='trace-viewer-container'>
            <div className='trace-info-container'>
                {this.renderTraceInfo()}
            </div>
            <div className='fetch-buttons'>
                <button onClick={this.handleResourcesTimeGraph}>Resources</button>
                <button onClick={this.handleControlFlowTimeGraph}>Control Flow View</button>
                <button onClick={this.handleCpuXY}>CPU Usage</button>
                <button onClick={this.handleDiskXY}>Disk Usage</button>
                <button onClick={this.handleHistogramXY}>Histogram</button>
            </div>
            <div className='timegraph-info'>
                <textarea cols={50} rows={20} value={this.timeGraphTree}></textarea>
                <textarea cols={100} rows={20} value={this.timeGraphState}></textarea>
            </div>
            <div className='xy-info'>
                {this.renderLineChart()}
            </div>
            <div className='ag-theme-balham'>
                {this.renderEventsTable()}
            </div>
        </div>;
    }

    protected renderTraceInfo(): React.ReactNode {
        return <div className='trace-info-text'>
            <textarea
                cols={150}
                rows={7} value={this.traceInfoText}>
            </textarea>
        </div >;
    }

    protected renderEventsTable(): React.ReactNode {
        return <div className='ag-theme-balham' style={{ height: '500px' }}>
            <AgGridReact
                columnDefs={this.tableColumns}
                rowData={this.tableLines}>
            </AgGridReact>
        </div>;
    }
    protected renderLineChart(): React.ReactNode {
        // <textarea cols={50} rows={20} value={this.XYTree}></textarea>
        return <div className='xy-container'>
            <div className='tree-container'>
                <p>{this.XYTree}</p>
            </div>
            <div className='line-chart-container'>
                <Line data={this.XYData} options={{ responsive: true, elements: { point: { radius: 0 } } }}></Line>
            </div>
        </div>;
    }

    private async updateTraceInfo(currentTrace: Trace) {
        const trace = await this.tspClient.fetchTrace(currentTrace.UUID);
        this.openedTrace = trace;
        this.traceInfoText = this.traceToString(trace);
        this.update();

        // TODO: Not Good use observable
        if (trace.indexingStatus === 'RUNNING') {
            setTimeout(() => this.updateTraceInfo(trace), 1000);
        }
    }

    private traceToString(trace: Trace): string {
        return 'Name: ' + trace.name + '\n' +
            'UUID: ' + trace.UUID + '\n' +
            'Path: ' + trace.path + '\n' +
            'Start: ' + trace.start + '\n' +
            'End: ' + trace.end + '\n' +
            'Nb of Events: ' + trace.nbEvents + '\n' +
            'Indexing Status: ' + trace.indexingStatus;
    }

    private async updateEventsTable() {
        if (!this.openedTrace) {
            return;
        }

        const columnsParameters: Query = QueryHelper.timeQuery([0, 1]);
        const columnResponse = await this.tspClient.fetchTableColumns<Entry, EntryHeader>(this.openedTrace.UUID,
            'org.eclipse.tracecompass.internal.provisional.tmf.core.model.events.TmfEventTableDataProvider', columnsParameters);
        const columnEntries = columnResponse.model.entries;
        const columnIds: Array<number> = new Array;
        const columnsArray = new Array<any>();
        columnEntries.forEach(entry => {
            columnIds.push(entry.id);
            const columnName = entry.name;
            columnsArray.push({
                headerName: columnName,
                field: entry.id.toString(),
                width: 200
            });
        });
        this.tableColumns = columnsArray;

        const lineParameter = QueryHelper.tableQuery(columnIds, 0, 500);
        const lineResponse = await this.tspClient.fetchTableLines(this.openedTrace.UUID,
            'org.eclipse.tracecompass.internal.provisional.tmf.core.model.events.TmfEventTableDataProvider', lineParameter);

        const model = lineResponse.model;
        const lines = model.lines;
        const linesArray = new Array<any>();
        lines.forEach(line => {
            const obj: any = {};
            const cells = line.cells;
            const ids = model.columnIds;
            for (let i = 0; i < cells.length; i++) {
                obj[ids[i]] = cells[i].content;
            }
            linesArray.push(obj);
        });
        this.tableLines = linesArray;

        this.update();
    }

    private async handleResourcesTimeGraph() {
        if (!this.openedTrace) {
            return;
        }

        const resourcesTreeParameters = QueryHelper.timeQuery([0, 1]);
        const treeResponse = await this.tspClient.fetchTimeGraphTree<TimeGraphEntry, EntryHeader>(this.openedTrace.UUID,
            'org.eclipse.tracecompass.internal.analysis.os.linux.core.threadstatus.ResourcesStatusDataProvider', resourcesTreeParameters);
        const treeModel = treeResponse.model;
        const entries = treeModel.entries;
        this.timeGraphTree = this.buildTree(treeModel.entries).toString();

        const selectedItems = new Array<number>();
        entries.forEach(timeGraphEntry => {
            selectedItems.push(timeGraphEntry.id);
        });

        const statesParameters = QueryHelper.selectionTimeQuery(QueryHelper.splitRangeIntoEqualParts(1332170682440133097, 1332170682540133097, 1165), selectedItems);
        const stateResponse = await this.tspClient.fetchTimeGraphStates<TimeGraphModel>(this.openedTrace.UUID,
            'org.eclipse.tracecompass.internal.analysis.os.linux.core.threadstatus.ResourcesStatusDataProvider', statesParameters);

        const stateModel = stateResponse.model;
        this.timeGraphState = JSON.stringify(stateModel);
        this.update();
    }

    private async handleControlFlowTimeGraph() {
        console.log('Control flow clicked');
    }

    private async handleCpuXY() {
        if (!this.openedTrace) {
            return;
        }

        const cpuTreeParameters = QueryHelper.selectionTimeQuery(
            QueryHelper.splitRangeIntoEqualParts(1332170682440133097, 1332170682540133097, 1165), [], [], { 'cpus': [] });
        let cpuTreeResponse = await this.tspClient.fetchXYTree<Entry, EntryHeader>(this.openedTrace.UUID,
            'org.eclipse.tracecompass.analysis.os.linux.core.cpuusage.CpuUsageDataProvider', cpuTreeParameters);
        let treeModel = cpuTreeResponse.model;
        while (!treeModel || cpuTreeResponse.status === ResponseStatus.RUNNING) {
            cpuTreeResponse = await this.tspClient.fetchXYTree<Entry, EntryHeader>(this.openedTrace.UUID,
                'org.eclipse.tracecompass.analysis.os.linux.core.cpuusage.CpuUsageDataProvider', cpuTreeParameters);
            treeModel = cpuTreeResponse.model;
            this.XYTree = 'CPU Usage analysis is ' + cpuTreeResponse.status;
            this.update();
        }
        this.XYTree = this.buildTree(treeModel.entries).toString();

        const cpuXYParameters = QueryHelper.selectionTimeQuery(
            QueryHelper.splitRangeIntoEqualParts(1332170682440133097, 1332170682540133097, 1165), [treeModel.entries[0].id, treeModel.entries[1].id]);

        const cpuXYResponse = await this.tspClient.fetchXY(this.openedTrace.UUID,
            'org.eclipse.tracecompass.analysis.os.linux.core.cpuusage.CpuUsageDataProvider', cpuXYParameters);

        // TODO Fix that, model is wrong, map are not working
        const cpuXY = cpuXYResponse.model;
        const seriesObject = cpuXY.series;
        // TODO SO WRONG !!!!!!
        const secondEntry: any = treeModel.entries[1];
        this.buildMultiSeriesLineChart(seriesObject, ['total:' + treeModel.entries[0].name, treeModel.entries[0].name + ':' + secondEntry.tid]);
        // const series: XYSeries = seriesObject['total:' + treeModel.entries[0].name];
        // this.buildLineChart(series.xValues, series.yValues);

        this.update();
    }

    private async handleDiskXY() {
        console.log('Disk clicked');
    }

    private async handleHistogramXY() {
        if (!this.openedTrace) {
            return;
        }

        const histogramTreeParameters = QueryHelper.timeQuery([0, 1]);
        const treeResponse = await this.tspClient.fetchXYTree<Entry, EntryHeader>(this.openedTrace.UUID,
            'org.eclipse.tracecompass.internal.tmf.core.histogram.HistogramDataProvider', histogramTreeParameters);
        const treeModel = treeResponse.model;
        this.XYTree = this.buildTree(treeModel.entries).toString();

        const nameMap: Map<number, string> = new Map();
        const selectedItems = new Array<number>();
        treeModel.entries.forEach(entry => {
            if (entry.parentId !== -1) {
                selectedItems.push(entry.id);
            }
            const name = nameMap.get(entry.parentId);
            const entryName = entry.name;
            if (name) {
                nameMap.set(entry.id, name + '/' + entryName);
            } else {
                nameMap.set(entry.id, entryName.toString());
            }
        });

        const histogramParameters = QueryHelper.selectionTimeQuery(QueryHelper.splitRangeIntoEqualParts(1332170682440133097, 1332170682540133097, 1165), selectedItems);
        const histogramResponse = await this.tspClient.fetchXY(this.openedTrace.UUID,
            'org.eclipse.tracecompass.internal.tmf.core.histogram.HistogramDataProvider', histogramParameters);
        const model = histogramResponse.model;
        // this.buildLineChart(model.xaxis, model.ydata['kernel\/Total'].data);
        const serieName = nameMap.get(selectedItems[0]);
        // TODO Fix that, model is wrong, map are not working
        if (serieName) {
            const seriesMap = model.series;
            const series = seriesMap[serieName];
            if (series) {
                this.buildLineChart(this.openedTrace.name, series.xValues, series.yValues);
            }
        }

        this.update();
    }

    private buildLineChart(seriesLabel: string, xValues: any[], yValues: any[]) {
        const lineData = {
            labels: xValues,
            datasets: [
                {
                    label: seriesLabel,
                    backgroundColor: 'rgba(75,192,192,0.4)',
                    data: yValues
                }
            ]
        };
        this.XYData = lineData;
    }

    private buildMultiSeriesLineChart(seriesObj: { [key: string]: XYSeries }, seriesToShow: Array<string>) {
        const dataSetArray = new Array<any>();
        seriesToShow.forEach(seriesName => {
            const series = seriesObj[seriesName];
            const bValue = Math.floor(Math.random() * 76) + 180;
            const gValue = Math.floor(Math.random() * 76) + 180;
            const color = 'rgba(75,' + gValue.toString() + ',' + bValue.toString() + ',0.4)';
            dataSetArray.push({
                label: seriesName,
                backgroundColor: color,
                data: series.yValues
            });
        });
        const lineData = {
            labels: seriesObj[seriesToShow[0]].xValues,
            datasets: dataSetArray
        };
        this.XYData = lineData;
    }

    private buildTree(entries: Entry[]): any {
        let root: any;
        entries.forEach(entry => {
            // const treeEntry = this.XYEntriesMap.get(entry.id);
            if(entry.parentId !== -1) {
                const treeEntry = new this.XYTreeNode(entry.id, entry.name[0]);
                const parent = this.XYEntriesMap.get(entry.parentId);
                parent.addChild(treeEntry);
                this.XYEntriesMap.set(entry.id, treeEntry);
            } else {
                root = new this.XYTreeNode(entry.id, entry.name[0]);
                this.XYEntriesMap.set(entry.id, root);
            }
        });
        return root;
    }

    // private buildTree(entries: Entry[]): string {
    //     let result: string = '';
    //     entries.forEach(entry => {
    //         result += JSON.stringify(entry) + '\n'; // 'Name: ' + entry.name + ' ID: ' + entry.id + ' Parent ID: ' + entry.parentId + '\n';
    //     });

    //     return result;
    // }

    XYTreeNode = class {
        public _id: number;
        public _name: string;
        public _children: any[] = [];
        constructor(id: number, name: string) {
            this._id = id;
            this._name = name;
        }

        public addChild(child: any) {
            this._children.push(child);
        }

        public toString(): string {
            let result = this._name + ' (' + this._id + ')' + '\n';
            if(this._children.length > 0) {
                this._children.forEach(child => {
                    result = result + '\t' + child.toString();
                });
            }
            return result;
            // return 'Id: ' + this._id + ' Name: ' + this._name;
        }
    };
}
