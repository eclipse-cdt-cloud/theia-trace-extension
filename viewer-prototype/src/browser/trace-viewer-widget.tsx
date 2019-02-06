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
import * as GridLayout from 'react-grid-layout';


export const TraceViewerWidgetOptions = Symbol('TraceViewerWidgetOptions');
export interface TraceViewerWidgetOptions {
    traceURI: string;
}

@injectable()
export class TraceViewerWidget extends ReactWidget {

    static ID = 'trace-viewer';
    static LABEL = 'Trace Viewer';

    protected readonly uri: Path;
    private openedTrace: Trace | undefined;
    private traceInfo: Array<any> = new Array();
    private tableColumns: Array<any> = new Array();
    private tableLines: Array<any> = new Array();

    private timeGraphTree: string = '';
    private timeGraphTitle: string = '';
    private timeGraphState: string = '';

    private XYData: object = {};
    private XYTree: string = '';
    private XYTitle: string = '';

    constructor(
        @inject(TraceViewerWidgetOptions) protected readonly options: TraceViewerWidgetOptions,
        @inject(TraceManager) private traceManager: TraceManager,
        @inject(TspClient) private tspClient: TspClient
    ) {
        super();
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
                this.traceInfo = this.traceToGridLines(trace);
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
            <GridLayout className='viewer-grid' cols={1} rowHeight={100} width={1600} draggableHandle={'.widget-handle'}>            
                <div className='trace-info-container' key='trace-info' data-grid={{x: 0, y: 0, w: 1, h: 3}}>
                    {this.renderTraceInfo()}
                </div>
                <div className='fetch-buttons' key='action-buttons' data-grid={{x: 0, y: 0, w: 1, h: 1}}>
                    <button onClick={this.handleResourcesTimeGraph}>Resources</button>
                    <button onClick={this.handleControlFlowTimeGraph}>Control Flow View</button>
                    <button onClick={this.handleCpuXY}>CPU Usage</button>
                    <button onClick={this.handleDiskXY}>Disk Usage</button>
                    <button onClick={this.handleHistogramXY}>Histogram</button>
                </div>
                <div className='timegraph-info' key='time-graph-area' data-grid={{x: 0, y: 0, w: 1, h: 4}}>
                    {this.renderTimeGraph()}
                </div>            
                <div className='xy-info' key='xy-area' data-grid={{x: 0, y: 0, w: 1, h: 6}}>
                    {this.renderLineChart()}
                </div>
                <div key='events-table' data-grid={{x: 0, y: 0, w: 1, h: 5}}>
                    {this.renderEventsTable()}
                </div>
            </GridLayout>
        </div>;
    }

    protected renderTimeGraph() {
        if (!this.openedTrace) {
            return;
        }
        return <div className='timegraph-view'>
            <div className='widget-handle'>
                {this.timeGraphTitle}
            </div>
            <div className='timegraph-tree-container'>
                <p>{this.timeGraphTree}</p>
            </div>
            <div className='timegraph-states'>
                <p>{this.timeGraphState}</p>
            </div>
        </div>
    }

    protected renderTraceInfo(): React.ReactNode {
        return <div className='ag-theme-balham-dark' style={{ height: '250px' }}>
                <div className='widget-handle'>
                    {'Trace Properties'}
                </div>
                <AgGridReact
                    enableColResize={true}
                    columnDefs={[{headerName: 'Property', field: 'property', width: 130}, {headerName: 'Value', field: 'value', width: 500}]}
                    rowData={this.traceInfo}>
                </AgGridReact>
            </div>;
    }

    protected renderEventsTable(): React.ReactNode {
        return <div className='ag-theme-balham-dark' style={{ height: '500px' }}>
            <div className='widget-handle'>
                {'Events'}
            </div>
            <AgGridReact
                columnDefs={this.tableColumns}
                rowData={this.tableLines}>
            </AgGridReact>
        </div>;
    }
    protected renderLineChart(): React.ReactNode {
        return <div className='xy-container'>
            <div className='widget-handle'>
                {this.XYTitle}
            </div>
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
        this.traceInfo = this.traceToGridLines(trace);
        this.update();

        // TODO: Not Good use observable
        if (trace.indexingStatus === 'RUNNING') {
            setTimeout(() => this.updateTraceInfo(trace), 1000);
        }
    }

    private traceToGridLines(trace: Trace): Array<any> {
        return [{ property: 'Name', value: trace.name },
        { property: 'UUID', value: trace.UUID },
        { property: 'Path', value: trace.path },
        { property: 'Start time', value: trace.start },
        { property: 'End time', value: trace.end },
        { property: 'Nb of Events', value: trace.nbEvents },
        { property: 'Indexing Status', value: trace.indexingStatus }];
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
        this.timeGraphTitle = 'Resources';

        const resourcesTreeParameters = QueryHelper.timeQuery([0, 1]);
        const treeResponse = await this.tspClient.fetchTimeGraphTree<TimeGraphEntry, EntryHeader>(this.openedTrace.UUID,
            'org.eclipse.tracecompass.internal.analysis.os.linux.core.threadstatus.ResourcesStatusDataProvider', resourcesTreeParameters);
        const treeModel = treeResponse.model;
        const entries = treeModel.entries;
        this.timeGraphTree = this.buildTree(entries).toString();

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

        this.XYTitle = 'CPU Usage';

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

        this.XYTitle = 'Histogram';

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
        const entriesMap: Map<number, any> = new Map();
        let root: any;
        entries.forEach(entry => {
            // TODO: very ugly hack since the server serialization is wrong
            const entryName = (entry as any).names[0];
            if(entry.parentId !== -1) {
                const treeEntry = new this.EntryTreeNode(entry.id, entryName);
                const parent = entriesMap.get(entry.parentId);
                parent.addChild(treeEntry);
                entriesMap.set(entry.id, treeEntry);
            } else {
                root = new this.EntryTreeNode(entry.id, entryName);
                entriesMap.set(entry.id, root);
            }
        });
        return root;
    }

    EntryTreeNode = class {
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
            let result = (this._name === '' ? '----------' : this._name) + ' (' + this._id + ')' + '\n';
            if(this._children.length > 0) {
                this._children.forEach(child => {
                    result = result + '\t' + child.toString();
                });
            }
            return result;
        }
    };
}
