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
import { Message, StatusBar, StatusBarAlignment } from '@theia/core/lib/browser';
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
import { TimeGraphEntry } from 'tsp-typescript-client/lib/models/timegraph';
import { XYSeries } from 'tsp-typescript-client/lib/models/xy';
import { ResponseStatus } from 'tsp-typescript-client/lib/models/response/responses';
import { QueryHelper } from 'tsp-typescript-client/lib/models/query/query-helper';
import * as GridLayout from 'react-grid-layout';
import { TimeGraphView } from './timegraph-view/timegraph-view';
import { TimeGraphRowElement } from 'timeline-chart/lib/components/time-graph-row-element';
import { OutputDescriptor } from 'tsp-typescript-client/lib/models/output-descriptor';
import { TimeGraphUnitController } from 'timeline-chart/lib/time-graph-unit-controller';
import { TimelineChart } from 'timeline-chart/lib/time-graph-model';
import { List, ListRowProps } from 'react-virtualized';
import { EntryTreeNode } from './entry-tree-node';
import { createStore } from 'redux';
import { Provider } from 'react-redux';
import { TestReactComponent } from './test-react-component';

export const TraceViewerWidgetOptions = Symbol('TraceViewerWidgetOptions');
export interface TraceViewerWidgetOptions {
    traceURI: string;
}

// export default connect()(TestReactComponent);

@injectable()
export class TraceViewerWidget extends ReactWidget {
    static ID = 'trace-viewer';
    static LABEL = 'Trace Viewer';

    private readonly RESOURCES_OUTPUT_ID: string = 'org.eclipse.tracecompass.internal.analysis.os.linux.core.threadstatus.ResourcesStatusDataProvider';
    private readonly THREAD_STATUS_OUTPUT_ID: string = 'org.eclipse.tracecompass.internal.analysis.os.linux.core.threadstatus.ThreadStatusDataProvider';

    protected readonly uri: Path;
    private openedTrace: Trace | undefined;
    // private traceInfo: Array<any> = new Array();
    private tableColumns: Array<any> = new Array();
    private tableLines: Array<any> = new Array();
    private outputDescriptors: OutputDescriptor[] | undefined;

    // private timeGraphView: TimeGraphView | undefined;
    private timeGraphViews: Map<string, TimeGraphView> = new Map();
    private timeGraphTrees: Map<string, EntryTreeNode> = new Map();
    // private timeGraphTree: string = '';
    // private timeGraphTitle: string = '';
    // private timeGraphState: string = '';
    private selectedState: TimeGraphRowElement | undefined;
    private hoveredState: TimeGraphRowElement | undefined;

    private XYData: object = {};
    private XYTree: string = '';
    private XYTitle: string = '';

    private unitController: TimeGraphUnitController = new TimeGraphUnitController(0);

    private store = createStore((state, action) => {
        switch (action.type) {
            case 'SET_VISIBILITY_FILTER':
                return action.type;
            default:
                return state;
        }
    });

    constructor(
        @inject(TraceViewerWidgetOptions) protected readonly options: TraceViewerWidgetOptions,
        @inject(TraceManager) private traceManager: TraceManager,
        @inject(TspClient) private tspClient: TspClient,
        @inject(StatusBar) private statusBar: StatusBar
    ) {
        super();
        this.uri = new Path(this.options.traceURI);
        this.id = 'theia-traceOpen';
        this.title.label = 'Trace: ' + this.uri.base;
        this.title.closable = true;
        this.addClass('theia-trace-open');
        this.unitController.onSelectionRangeChange(range => {this.handleTimeSelectionChange(range)});
        this.unitController.onViewRangeChanged(viewRange => {this.handleViewRangeChange(viewRange)});
        this.initialize();
    }

    async initialize(): Promise<void> {
        const trace = await this.traceManager.openTrace(this.uri, this.uri.name);
        if (trace) {
            this.openedTrace = trace;
            // this.traceInfo = this.traceToGridLines(trace);
            this.outputDescriptors = await this.traceManager.getAvailableOutputs(trace.name);
            this.updateTraceInfo(trace);
            this.updateEventsTable();
        }
        // this.traceManager.openTrace(this.uri, this.uri.name).then(trace => {
        //     if (trace) {
        //         this.openedTrace = trace;
        //         this.traceInfo = this.traceToGridLines(trace);
        //         this.updateTraceInfo(trace);
        //         this.updateEventsTable();
        //     }
        // });
        this.update();
    }

    onCloseRequest(msg: Message) {
        if (this.openedTrace) {
            this.traceManager.closeTrace(this.openedTrace, this.uri);
        }
        this.statusBar.removeElement('time-selection-range');
        super.onCloseRequest(msg);
    }

    protected onResize() {
        this.timeGraphViews.forEach((value) => {
            value.onWidgetResize();
        });
        // if (this.timeGraphView) {
        //     this.timeGraphView.onWidgetResize();
        // }
    }

    protected render(): React.ReactNode {
        this.handleHistogramXY = this.handleHistogramXY.bind(this);
        this.handleResourcesTimeGraph = this.handleResourcesTimeGraph.bind(this);
        this.handleControlFlowTimeGraph = this.handleControlFlowTimeGraph.bind(this);
        this.handleCpuXY = this.handleCpuXY.bind(this);
        return <Provider store={this.store}>
            <div className='trace-viewer-container'>
                <TestReactComponent name={'Simon'}/>
                <div className='time-axis-container'>
                    {this.renderTimeAxis()}
                </div>
                <GridLayout className='viewer-grid' cols={1} rowHeight={100} width={1600} draggableHandle={'.widget-handle'}>
                    {/* <div className='trace-info-container' key='trace-info' data-grid={{x: 0, y: 0, w: 1, h: 3}}>
                    {this.renderTraceInfo()}
                </div> */}
                    <div className='timegraph-info' key='time-graph-resources' data-grid={{ x: 0, y: 0, w: 1, h: 4 }}>
                        {this.renderTimeGraph(this.RESOURCES_OUTPUT_ID)}
                    </div>
                    <div className='timegraph-info' key='time-graph-thread' data-grid={{ x: 0, y: 0, w: 1, h: 4 }}>
                        {this.renderTimeGraph(this.THREAD_STATUS_OUTPUT_ID)}
                    </div>
                    {/* <div className='fetch-buttons' key='action-buttons' data-grid={{x: 0, y: 0, w: 1, h: 1}}>
                    <button onClick={this.handleResourcesTimeGraph}>Resources</button>
                    <button onClick={this.handleControlFlowTimeGraph}>Control Flow View</button>
                    <button onClick={this.handleCpuXY}>CPU Usage</button>
                    <button onClick={this.handleDiskXY}>Disk Usage</button>
                    <button onClick={this.handleHistogramXY}>Histogram</button>
                </div> */}
                    <div className='xy-info' key='xy-area' data-grid={{ x: 0, y: 0, w: 1, h: 6 }}>
                        {this.renderLineChart()}
                    </div>
                    <div key='events-table' data-grid={{ x: 0, y: 0, w: 1, h: 5 }}>
                        {this.renderEventsTable()}
                    </div>
                </GridLayout>
            </div>
        </Provider>;
    }

    private renderTimeAxis() {
        if (!this.openedTrace || this.openedTrace.indexingStatus === 'RUNNING') {
            return;
        }

        const timeGraphView = this.timeGraphViews.get(this.RESOURCES_OUTPUT_ID);
        if (timeGraphView) {
            return timeGraphView.getAxisContainer();
        } else {
            setTimeout(() => this.update(), 1000);
        }
        return;
    }

    private handleTimeSelectionChange(range: TimelineChart.TimeGraphRange) {
        this.statusBar.setElement('time-selection-range', {
            text: `T1: ${Math.round(range.start)} T2: ${Math.round(range.end)} Delta: ${Math.round(range.end - range.start)}`,
            alignment: StatusBarAlignment.LEFT,
        });
    }

    private handleViewRangeChange(viewRange: TimelineChart.TimeGraphRange) {
        this.handleCpuXY();
    }

    protected renderTimeGraph(outputId: string) {
        if(!this.openedTrace || this.openedTrace.indexingStatus === 'RUNNING') {
            return;
        }

        let timeGraphView = this.timeGraphViews.get(outputId);
        if (!timeGraphView) {
            timeGraphView = new TimeGraphView(this.tspClient, outputId, this.unitController, {
                selectionHandler: (el?: TimeGraphRowElement) => { this.selectedState = el; console.log('Selected state: ', this.selectedState); this.update(); },
                mouseOverHandler: (el?: TimeGraphRowElement) => { this.hoveredState = el; console.log('Hovered state: ', this.hoveredState); this.update(); },
                mouseOutHandler: (el?: TimeGraphRowElement) => { this.hoveredState = undefined; this.update(); },
                updateHandler: () => { this.update(); }
            });
            this.timeGraphViews.set(outputId, timeGraphView);
        }

        // const outputDescriptors = await this.traceManager.getAvailableOutputs(this.openedTrace.name);
        let timeGraphTitle: string = '';
        if (this.outputDescriptors) {
            // const descriptor = this.outputDescriptors.find(descriptor => descriptor.ID === outputId);
            let descriptor: OutputDescriptor | undefined;
            this.outputDescriptors.forEach(outputDescriptor => {
                const id = (outputDescriptor as any).id;
                if(id === outputId) {
                    descriptor = outputDescriptor;
                }
            });

            if (descriptor) {
                timeGraphTitle = descriptor.name;
            }
        }

        // const timeGraphTree = this.timeGraphTrees.get(outputId);
        this.updateTimeGraphTree(outputId);

        // if (!this.timeGraphView) {
        //     this.timeGraphView = new TimeGraphView(this.tspClient, outputId, {
        //         selectionHandler: (el?: TimeGraphRowElement) => { this.selectedState = el; console.log('Selected state: ', this.selectedState); this.update(); },
        //         mouseOverHandler: (el?: TimeGraphRowElement) => { this.hoveredState = el; console.log('Hovered state: ', this.hoveredState); this.update(); },
        //         mouseOutHandler: (el?: TimeGraphRowElement) => { this.hoveredState = undefined; this.update(); },
        //         updateHandler: () => { this.update(); }
        //     });
        // }
        // const uuid = this.openedTrace ? this.openedTrace.UUID : '';

        // if (!this.openedTrace) {
        //     return;
        // }
        this.resourcesTreeNodeRenderer = this.resourcesTreeNodeRenderer.bind(this);
        this.threadsTreeNodeRenderer = this.threadsTreeNodeRenderer.bind(this);

        return <div className='timegraph-view'>
            <div className='widget-handle'>
                <div>{timeGraphTitle}</div>
            </div>
            <div className='timegraph-tree-container'>
            <List
                        id={outputId}
                        height={430}
                        width={235}
                        rowCount={this.entryCount(outputId)}
                        rowHeight={15}
                        rowRenderer={outputId === this.RESOURCES_OUTPUT_ID ? this.resourcesTreeNodeRenderer : this.threadsTreeNodeRenderer} />
                {/* <p>{timeGraphTree ? timeGraphTree : ''}</p> */}
            </div>
            <div id='timegraph-main' className='ps__child--consume' onWheel={ev => { ev.preventDefault(); ev.stopPropagation(); }}>
                {timeGraphView.renderTimeGraphChart()}
            </div>
            {/* <div className='timegraph-states'>
                <p>{this.timeGraphState}</p>
            </div> */}
        </div>;
    }

    private entryCount(outputId: string): number {
        if (!this.timeGraphTrees) {
            return 0;
        }

        const root = this.timeGraphTrees.get(outputId);
        return root ? root.getNbChildren() : 0;
    }

    private resourcesTreeNodeRenderer(props: ListRowProps): React.ReactNode {
        return this.timeGraphTreeNodeRenderer(props, this.RESOURCES_OUTPUT_ID);
    }

    private threadsTreeNodeRenderer(props: ListRowProps): React.ReactNode {
        return this.timeGraphTreeNodeRenderer(props, this.THREAD_STATUS_OUTPUT_ID);
    }

    private timeGraphTreeNodeRenderer(props: ListRowProps, outputId: string): React.ReactNode {
        let entryName = '';
        let entryLevel = 0;
        if (this.timeGraphTrees) {
            const entryRoot = this.timeGraphTrees.get(outputId);
            let entryList: EntryTreeNode[] = new Array();
            if (entryRoot) {
                entryList = entryRoot.toFlatList();
            }

            entryName = entryList[props.index]._name;
            entryLevel = entryList[props.index]._indentLevel;
        }

        return <div className='tree-node' key={props.key} style={{ ...props.style, paddingLeft: entryLevel * 15 }}>
            {entryName}
        </div>
    }

    private async updateTimeGraphTree(outputId: string) {
        if (!this.timeGraphTrees.get(outputId) && this.openedTrace) {
            const treeParameters = QueryHelper.timeQuery([0, 1]);
            const treeResponse = await this.tspClient.fetchTimeGraphTree<TimeGraphEntry, EntryHeader>(this.openedTrace.UUID,
                outputId, treeParameters);
            const treeModel = treeResponse.model;
            const entries = treeModel.entries;
            const timeGraphTree = this.buildTree(entries);
            this.timeGraphTrees.set(outputId, timeGraphTree);
            this.update();
        }
    }

    // protected renderTraceInfo(): React.ReactNode {
    //     return <div className='ag-theme-balham-dark' style={{ height: '250px' }}>
    //             <div className='widget-handle'>
    //                 {'Trace Properties'}
    //             </div>
    //             <AgGridReact
    //                 enableColResize={true}
    //                 columnDefs={[{headerName: 'Property', field: 'property', width: 130}, {headerName: 'Value', field: 'value', width: 500}]}
    //                 rowData={this.traceInfo}>
    //             </AgGridReact>
    //         </div>;
    // }

    protected renderEventsTable(): React.ReactNode {
        return <div id='events-table' className='ag-theme-balham-dark' style={{ height: '500px' }}>
            <div className='widget-handle'>
                <div>{'Events'}</div>
            </div>
            <AgGridReact
                columnDefs={this.tableColumns}
                rowData={this.tableLines}>
            </AgGridReact>
        </div>;
    }
    protected renderLineChart(): React.ReactNode {
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

        return <div className='xy-container'>
            <div className='widget-handle'>
                <div>{this.XYTitle}</div>
            </div>
            <div className='tree-container'>
                <p>{this.XYTree}</p>
            </div>
            <div className='line-chart-container'>
                <Line data={this.XYData} width={1240} height={500} options={lineOptions}></Line>
            </div>
        </div>;
    }

    private async updateTraceInfo(currentTrace: Trace) {
        const trace = await this.tspClient.fetchTrace(currentTrace.UUID);
        this.openedTrace = trace;
        // this.traceInfo = this.traceToGridLines(trace);
        this.update();

        // TODO: Not Good use observable
        if (trace.indexingStatus === 'RUNNING') {
            setTimeout(() => this.updateTraceInfo(trace), 1000);
        }
    }

    // private traceToGridLines(trace: Trace): Array<any> {
    //     return [{ property: 'Name', value: trace.name },
    //     { property: 'UUID', value: trace.UUID },
    //     { property: 'Path', value: trace.path },
    //     { property: 'Start time', value: trace.start },
    //     { property: 'End time', value: trace.end },
    //     { property: 'Nb of Events', value: trace.nbEvents },
    //     { property: 'Indexing Status', value: trace.indexingStatus }];
    // }

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
        // Only there for debugging purposes
        this.updateTimeGraphTree(this.RESOURCES_OUTPUT_ID);

        // if (!this.openedTrace) {
        //     return;
        // }
        // this.timeGraphTitle = 'Resources';

        // const resourcesTreeParameters = QueryHelper.timeQuery([0, 1]);
        // const treeResponse = await this.tspClient.fetchTimeGraphTree<TimeGraphEntry, EntryHeader>(this.openedTrace.UUID,
        //     this.RESOURCES_OUTPUT_ID, resourcesTreeParameters);
        // const treeModel = treeResponse.model;
        // const entries = treeModel.entries;
        // this.timeGraphTree = this.buildTree(entries).toString();

        // const selectedItems = new Array<number>();
        // entries.forEach(timeGraphEntry => {
        //     selectedItems.push(timeGraphEntry.id);
        // });

        // const statesParameters = QueryHelper.selectionTimeQuery(QueryHelper.splitRangeIntoEqualParts(1332170682440133097, 1332170682540133097, 1165), selectedItems);
        // const stateResponse = await this.tspClient.fetchTimeGraphStates<TimeGraphModel>(this.openedTrace.UUID,
        //     RESOURCES_OUTPUT_ID, statesParameters);

        // const stateModel = stateResponse.model;
        // this.timeGraphState = JSON.stringify(stateModel);
        // this.update();
    }

    private async handleControlFlowTimeGraph() {
        // Only there for debugging purposes
        this.updateTimeGraphTree(this.RESOURCES_OUTPUT_ID);

        // if (!this.openedTrace) {
        //     return;
        // }
        // this.timeGraphTitle = 'Thread Status';

        // const ThreadStatusTreeParameters = QueryHelper.timeQuery([0, 1]);
        // const treeResponse = await this.tspClient.fetchTimeGraphTree<TimeGraphEntry, EntryHeader>(this.openedTrace.UUID,
        //     this.THREAD_STATUS_OUTPUT_ID, ThreadStatusTreeParameters);
        // const treeModel = treeResponse.model;
        // const entries = treeModel.entries;
        // this.timeGraphTree = this.buildTree(entries).toString();

        // const selectedItems = new Array<number>();
        // entries.forEach(timeGraphEntry => {
        //     selectedItems.push(timeGraphEntry.id);
        // });

        // this.update();
    }

    private async handleCpuXY() {
        if (!this.openedTrace) {
            return;
        }

        this.XYTitle = 'CPU Usage';

        const cpuTreeParameters = QueryHelper.selectionTimeQuery(
            QueryHelper.splitRangeIntoEqualParts(1332170682440133097, 1332170682540133097, 1120), [], [], { 'cpus': [] });
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

        // const start = viewRange.start + this.timeGraphEntries[0].startTime;
        // const end = viewRange.end + this.timeGraphEntries[0].startTime;
        // statesParameters = QueryHelper.selectionTimeQuery(QueryHelper.splitRangeIntoEqualParts(Math.trunc(start), Math.trunc(end), 1120), selectedItems);

        let start = 1332170682440133097;
        let end = 1332170682540133097;
        const viewRange = this.unitController.viewRange;
        if (viewRange) {
            start = viewRange.start + this.openedTrace.start;
            end = viewRange.end + this.openedTrace.end;
        }

        const cpuXYParameters = QueryHelper.selectionTimeQuery(
            QueryHelper.splitRangeIntoEqualParts(Math.trunc(start), Math.trunc(end), 1120), [treeModel.entries[0].id, treeModel.entries[1].id]);

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

    // private async handleDiskXY() {
    //     console.log('Disk clicked');
    // }

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
                fill: false,
                borderColor: color,
                borderWidth: 2,
                data: series.yValues
            });
        });
        const lineData = {
            labels: seriesObj[seriesToShow[0]].xValues,
            datasets: dataSetArray
        };
        this.XYData = lineData;
    }

    private buildTree(entries: Entry[]): EntryTreeNode {
        const entriesMap: Map<number, EntryTreeNode> = new Map();
        let root: any;
        entries.forEach(entry => {
            // TODO: very ugly hack since the server serialization is wrong
            const entryName = (entry as any).labels[0];
            if(entry.parentId !== -1) {
                const parent = entriesMap.get(entry.parentId);
                if (parent) {
                    const treeEntry = new EntryTreeNode(entry.id, entryName, parent._indentLevel + 1);
                    parent.addChild(treeEntry);
                    entriesMap.set(entry.id, treeEntry);
                }
            } else {
                root = new EntryTreeNode(entry.id, entryName, 0);
                entriesMap.set(entry.id, root);
            }
        });
        return root;
    }

    // EntryTreeNode = class {
    //     public _id: number;
    //     public _name: string;
    //     public _children: any[] = [];
    //     constructor(id: number, name: string) {
    //         this._id = id;
    //         this._name = name;
    //     }

    //     public addChild(child: any) {
    //         this._children.push(child);
    //     }

    //     public toString(): string {
    //         let result = (this._name === '' ? '----------' : this._name) + ' (' + this._id + ')' + '\n';
    //         if(this._children.length > 0) {
    //             this._children.forEach(child => {
    //                 result = result + '\t' + child.toString();
    //             });
    //         }
    //         return result;
    //     }
    // };
}
