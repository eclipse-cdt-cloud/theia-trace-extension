/* eslint-disable @typescript-eslint/no-explicit-any */
import { AbstractOutputComponent, AbstractOutputProps, AbstractOutputState } from './abstract-output-component';
import * as React from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, IDatasource, GridReadyEvent, CellClickedEvent, GridApi } from 'ag-grid-community';
import { QueryHelper } from 'tsp-typescript-client/lib/models/query/query-helper';
import { cloneDeep } from 'lodash';
import { signalManager } from '@trace-viewer/base/lib/signal-manager';
import { TimelineChart } from 'timeline-chart/lib/time-graph-model';

type TableOuputState = AbstractOutputState & {
    tableColumns: ColDef[];
};

type TableOutputProps = AbstractOutputProps & {
    cacheBlockSize?: number;
    maxBlocksInCache?: number;
    columnWidth?: number;
    blockLoadDebounce?: number;
    tableHeight?: string;
    tableWidth?: string;
};

export class TableOutputComponent extends AbstractOutputComponent<TableOutputProps, TableOuputState> {
    private debugMode = false;
    private columnIds: Array<number> = [];
    private fetchColumns = true;
    private columnArray = new Array<any>();
    private showIndexColumn = false;
    private components: any;
    private gridApi: GridApi | undefined = undefined;
    private pendingIndex: number | undefined = undefined;
    private lastIndex = { timestamp: Number.MIN_VALUE, index: 0 };

    static defaultProps: Partial<TableOutputProps> = {
        cacheBlockSize: 200,
        maxBlocksInCache: 5,
        columnWidth: 200,
        blockLoadDebounce: 250,
        tableHeight: '300px',
        tableWidth: '100%'
    };

    constructor(props: TableOutputProps) {
        super(props);

        this.components = {
            loadingRenderer: (params: any) => {
                if (params.value !== undefined) {
                    return params.value;
                } else {
                    return '<i class="fa fa-spinner fa-spin"></i>';
                }
            }
        };

        this.props.unitController.onSelectionRangeChange(range => { this.handleTimeSelectionChange(range); });
        this.onEventClick = this.onEventClick.bind(this);
        this.onModelUpdated = this.onModelUpdated.bind(this);
    }

    renderMainArea(): React.ReactNode {
        return <div id='events-table'
            className={this.props.backgroundTheme === 'light' ? 'ag-theme-balham' : 'ag-theme-balham-dark'}
            style={{ height: this.props.style.height, width: this.props.widthWPBugWorkaround }}>
            <AgGridReact
                columnDefs={this.columnArray}
                rowModelType='infinite'
                cacheBlockSize={this.props.cacheBlockSize}
                maxBlocksInCache={this.props.maxBlocksInCache}
                blockLoadDebounceMillis={this.props.blockLoadDebounce}
                debug={this.debugMode}
                onGridReady={this.onGridReady}
                components={this.components}
                enableColResize={true}
                onCellClicked={this.onEventClick}
                rowSelection='single'
                onModelUpdated={this.onModelUpdated}
            >
            </AgGridReact>
        </div>;
    }

    componentDidMount() {
        this.props.unitController.onSelectionRangeChange(range => { this.handleTimeSelectionChange(range); });
    }

    componentWillUnmount() {
        // TODO: replace with removing the handler from unit controller
        // See timeline-chart issue #98
        // In the meantime, replace the handler with a noop on unmount
        this.handleTimeSelectionChange = () => Promise.resolve();
    }

    private onEventClick(event: CellClickedEvent) {
        const columns = event.columnApi.getAllColumns();
        const timestampHeader = columns.find(column => column.getColDef().headerName === 'Timestamp ns');
        if (timestampHeader) {
            const timestampCol = timestampHeader.getColDef().field;
            if (timestampCol) {
                const timestamp = event.data[timestampCol];
                const payload = { 'timestamp': timestamp };
                this.lastIndex = { timestamp: Math.trunc(Number(timestamp)), index: event.rowIndex };
                signalManager().fireSelectionChangedSignal(payload);
            }
        }
    }

    private async fetchTableLines(fetchIndex: number, linesToFetch: number) {
        const traceUUID = this.props.traceId;
        const tspClient = this.props.tspClient;
        const outputId = this.props.outputDescriptor.id;

        const tspClientResponse = await tspClient.fetchTableLines(traceUUID, outputId, QueryHelper.tableQuery(this.columnIds, fetchIndex, linesToFetch));
        const lineResponse = tspClientResponse.getModel();
        const linesArray = new Array<any>();
        if (!tspClientResponse.isOk() || !lineResponse) {
            return linesArray;
        }
        const model = lineResponse.model;
        const lines = model.lines;
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

        return linesArray;
    }

    private onGridReady = async (event: GridReadyEvent) => {
        this.gridApi = event.api;
        const dataSource: IDatasource = {
            getRows: async params => {
                if (this.fetchColumns) {
                    this.fetchColumns = false;
                    await this.init();
                }
                const rowsThisPage = await this.fetchTableLines(params.startRow, params.endRow - params.startRow);
                for (let i = 0; i < rowsThisPage.length; i++) {
                    const item = rowsThisPage[i];
                    const itemCopy = cloneDeep(item);
                    rowsThisPage[i] = itemCopy;
                }

                params.successCallback(rowsThisPage, this.props.nbEvents);
            }
        };
        event.api.setDatasource(dataSource);
    };

    private async init() {
        const traceUUID = this.props.traceId;
        const tspClient = this.props.tspClient;
        const outputId = this.props.outputDescriptor.id;

        // Fetch columns
        const tspClientResponse = await tspClient.fetchTableColumns(traceUUID, outputId, QueryHelper.timeQuery([0, 1]));
        const columnsResponse = tspClientResponse.getModel();
        const colIds: Array<number> = [];
        const columnsArray = new Array<any>();

        if (this.showIndexColumn) {
            columnsArray.push({
                headerName: 'Index',
                field: '0',
                width: this.props.columnWidth,
                cellRenderer: 'loadingRenderer'
            });
            colIds.push(0);
        }

        if (tspClientResponse.isOk() && columnsResponse) {
            const columnEntries = columnsResponse.model;
            columnEntries.forEach(columnHeader => {
                const id = this.showIndexColumn ? ++columnHeader.id : columnHeader.id;
                colIds.push(id);
                columnsArray.push({
                    headerName: columnHeader.name,
                    field: columnHeader.id.toString(),
                    width: this.props.columnWidth

                });
            });
            }

        if (!this.showIndexColumn) {
            columnsArray[0].cellRenderer = 'loadingRenderer';
        }

        this.columnIds = colIds;
        this.columnArray = columnsArray;

        this.setState({
            tableColumns: this.columnArray
        });
    }

    private async handleTimeSelectionChange(range: TimelineChart.TimeGraphRange) {
        const start = Math.trunc(this.props.range.getstart() + range.start);
        if (this.lastIndex.timestamp === start) {
            return;
        }
        const index = await this.fetchTableIndex(start);
        if (index && this.gridApi) {
            this.lastIndex = { timestamp: start, index: index };
            this.gridApi.deselectAll();
            this.gridApi.ensureIndexVisible(index);
            const node = this.gridApi.getDisplayedRowAtIndex(index);
            if (node.id) {
                node.setSelected(true);
            } else {
                this.pendingIndex = index;
            }
        }
    }

    private async fetchTableIndex(timestamp: number) {
        const traceUUID = this.props.traceId;
        const tspClient = this.props.tspClient;
        const outputId = this.props.outputDescriptor.id;
        const tspClientResponse = await tspClient.fetchTableLines(traceUUID, outputId,
            QueryHelper.timeQuery([timestamp], {[QueryHelper.REQUESTED_TABLE_COUNT_KEY]: 1}));
        const lineResponse = tspClientResponse.getModel();
        if (!tspClientResponse.isOk() || !lineResponse) {
            return undefined;
        }
        const model = lineResponse.model;
        const lines = model.lines;
        if (lines.length === 0) {
            return undefined;
        }
        return lines[0].index;
    }

    private onModelUpdated = async () => {
         if (this.pendingIndex && this.gridApi) {
            if (this.gridApi.getSelectedNodes().length === 0) {
                this.gridApi.getDisplayedRowAtIndex(this.pendingIndex).setSelected(true);
            }
            this.pendingIndex = undefined;
         }
    };
}
