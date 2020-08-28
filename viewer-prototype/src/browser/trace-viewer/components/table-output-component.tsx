/* eslint-disable @typescript-eslint/no-explicit-any */
import { AbstractOutputComponent, AbstractOutputProps, AbstractOutputState } from './abstract-output-component';
import * as React from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, IDatasource, GridReadyEvent } from 'ag-grid-community';
import { Entry, EntryHeader } from 'tsp-typescript-client/lib/models/entry';
import { QueryHelper } from 'tsp-typescript-client/lib/models/query/query-helper';
import { cloneDeep } from 'lodash'

type TableOuputState = AbstractOutputState & {
    tableColumns: ColDef[];
};

type TableOutputProps = AbstractOutputProps & {
    cacheBlockSize?: number;
    maxBlocksInCache?: number;
    columnWidth?: number;
    blockLoadDebounce?: number;
}

export class TableOutputComponent extends AbstractOutputComponent<TableOutputProps, TableOuputState> {
    private cacheBlockSize: number;
    private maxBlocksInCache: number;
    private blockLoadDebounce: number;
    private debugMode: boolean = false;
    private columnIds: Array<number> = [];
    private fetchColumns: boolean = true;
    private columnArray = new Array<any>();
    private showIndexColumn: boolean = false;
    private columnWidth: number;
    private components: any;

    constructor(props: TableOutputProps) {
        super(props);
        
        this.cacheBlockSize = this.props.cacheBlockSize ? this.props.cacheBlockSize : 200;
        this.maxBlocksInCache = this.props.maxBlocksInCache ? this.props.maxBlocksInCache : 5;
        this.blockLoadDebounce = this.props.blockLoadDebounce ? this.props.blockLoadDebounce : 250;
        this.columnWidth = this.props.columnWidth ? this.props.columnWidth : 200; 

        this.components = {
            loadingRenderer: (params: any) => {
                if (params.value !== undefined) {
                    return params.value;
                } else {
                    return '<i class="fa fa-spinner fa-spin"></i>';
                }
            }
        };

        this.state = {
            outputStatus: 'RUNNING',
            tableColumns: []
        };
    }

    renderMainArea(): React.ReactNode {
        return <div id='events-table' className='ag-theme-balham-dark' style={{ height: '300px', width: '100%' }}>
            <AgGridReact
                columnDefs={this.columnArray}
                rowModelType='infinite'
                cacheBlockSize={this.cacheBlockSize}
                maxBlocksInCache={this.maxBlocksInCache}
                blockLoadDebounceMillis={this.blockLoadDebounce}
                debug={this.debugMode}
                onGridReady={this.onGridReady}
                components={this.components}
            >
            </AgGridReact>
        </div>;
    }

    private async fetchTableLines(fetchIndex: number, linesToFetch: number) {
        const traceUUID = this.props.traceId;
        const tspClient = this.props.tspClient;
        const outPutId = this.props.outputDescriptor.id;

        const lineResponse = (await tspClient.fetchTableLines(traceUUID, outPutId, QueryHelper.tableQuery(this.columnIds, fetchIndex, linesToFetch))).getModel();
        const model = lineResponse.model;
        const lines = model.lines;
        const linesArray = new Array<any>();
        lines.forEach(line => {
            const obj: any = {};
            const cells = line.cells;
            const ids = model.columnIds;

            if (this.showIndexColumn) {
                obj[0] = line.index.toString();
            }

            for (let i = 0; i < cells.length; i++) {
                const id = this.showIndexColumn ? ids[i] + 1 : ids[i];
                obj[id] = cells[i].content;
            }
            linesArray.push(obj);
        });

        this.setState({
            tableColumns: this.columnArray,
            outputStatus: status
        });

        return linesArray;
    }

    private onGridReady = async (event: GridReadyEvent) => {
        const dataSource: IDatasource = {
            getRows: async params => {
                await this.init();
                let rowsThisPage = await this.fetchTableLines(params.startRow, params.endRow - params.startRow)
                for (let i = 0; i < rowsThisPage.length; i++) {
                    const item = rowsThisPage[i];
                    const itemCopy = cloneDeep(item);
                    rowsThisPage[i] = itemCopy;
                }

                if(rowsThisPage.length < this.cacheBlockSize) {
                    params.successCallback(rowsThisPage, params.startRow + rowsThisPage.length);
                }
                else {
                    params.successCallback(rowsThisPage);
                }
            }
        };
        event.api.setDatasource(dataSource);
    }

    private async init() {
        if (this.fetchColumns) {
            this.fetchColumns = false;
            const traceUUID = this.props.traceId;
            const tspClient = this.props.tspClient;
            const outPutId = this.props.outputDescriptor.id;

            // Fetch columns
            const columnsResponse = (await tspClient.fetchTableColumns<Entry, EntryHeader>(traceUUID, outPutId, QueryHelper.timeQuery([0, 1]))).getModel();
            const columnEntries = columnsResponse.model.entries;
            const colIds: Array<number> = [];
            const columnsArray = new Array<any>();

            if (this.showIndexColumn) {
                columnsArray.push({
                    headerName: 'Index',
                    field: '0',
                    width: this.columnWidth,
                    cellRenderer: 'loadingRenderer' 
                });
                colIds.push(0);
            }

            columnEntries.forEach(entry => {
                const id = this.showIndexColumn ? ++entry.id : entry.id;
                colIds.push(id);
                let columnName = '';
                if (entry.labels.length) {
                    columnName = entry.labels[0];
                }
                columnsArray.push({
                    headerName: columnName,
                    field: entry.id.toString(),
                    width: this.columnWidth
                });
            });

            if(!this.showIndexColumn){
                columnsArray[0].cellRenderer = 'loadingRenderer';
            }

            this.columnIds = colIds;
            this.columnArray = columnsArray;

            this.state = {
                tableColumns: this.columnArray,
                outputStatus: 'RUNNING'
            };
        }
    }
}
