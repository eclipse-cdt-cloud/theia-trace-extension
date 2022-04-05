/* eslint-disable @typescript-eslint/no-explicit-any */
import { AbstractOutputComponent, AbstractOutputProps, AbstractOutputState } from './abstract-output-component';
import * as React from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, IDatasource, GridReadyEvent, CellClickedEvent, GridApi, ColumnApi, Column, RowNode } from 'ag-grid-community';
import { QueryHelper } from 'tsp-typescript-client/lib/models/query/query-helper';
import { cloneDeep } from 'lodash';
import { signalManager } from 'traceviewer-base/lib/signals/signal-manager';
import { TimelineChart } from 'timeline-chart/lib/time-graph-model';
import { CellKeyDownEvent } from 'ag-grid-community/dist/lib/events';
import { Line } from 'tsp-typescript-client/lib/models/table';
import { SearchFilterRenderer, CellRenderer, LoadingRenderer } from './table-renderer-components';
import { ResponseStatus } from 'tsp-typescript-client';

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

enum Direction {
    NEXT,
    PREVIOUS
}

export class TableOutputComponent extends AbstractOutputComponent<TableOutputProps, TableOuputState> {
    private debugMode = false;
    private columnIds: Array<number> = [];
    private fetchColumns = true;
    private columnArray = new Array<any>();
    private showIndexColumn = false;
    private frameworkComponents: any;
    private gridApi: GridApi | undefined = undefined;
    private columnApi: ColumnApi | undefined = undefined;
    private prevStartTimestamp = -BigInt(2 ** 63);
    private startTimestamp = BigInt(2 ** 63);
    private endTimestamp = -BigInt(2 ** 63);
    private columnsPacked = false;
    private timestampCol: string | undefined = undefined;
    private eventSignal = false;
    private enableIndexSelection = true;
    private selectStartIndex = -1;
    private selectEndIndex = -1;
    private filterModel: Map<string, string> = new Map<string, string>();
    private dataSource: IDatasource;

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
        this.state = {
            outputStatus: ResponseStatus.RUNNING,
            tableColumns: []
        };

        this.frameworkComponents = {
            searchFilterRenderer: SearchFilterRenderer,
            loadingRenderer: LoadingRenderer,
            cellRenderer: CellRenderer
        };

        this.dataSource = {
            getRows: async params => {
                if (this.fetchColumns) {
                    this.fetchColumns = false;
                    await this.init();
                }
                const rowsThisPage = await this.fetchSearchTableLines(params.startRow, params.endRow - params.startRow);
                for (let i = 0; i < rowsThisPage.length; i++) {
                    const item = rowsThisPage[i];
                    const itemCopy = cloneDeep(item);
                    rowsThisPage[i] = itemCopy;
                }
                params.successCallback(rowsThisPage, this.props.nbEvents);
            }
        };
        this.onEventClick = this.onEventClick.bind(this);
        this.onModelUpdated = this.onModelUpdated.bind(this);
        this.onKeyDown = this.onKeyDown.bind(this);
        this.searchEvents = this.searchEvents.bind(this);
        this.findMatchedEvent = this.findMatchedEvent.bind(this);
        this.checkFocus = this.checkFocus.bind(this);
    }

    renderMainArea(): React.ReactNode {
        return <div id={this.props.traceId + this.props.outputDescriptor.id + 'focusContainer'}
            tabIndex={-1}
            onFocus={event=>this.checkFocus(event)}
            className={this.props.backgroundTheme === 'light' ? 'ag-theme-balham' : 'ag-theme-balham-dark'}
            style={{ height: this.props.style.height, width: this.props.outputWidth }}>
            <AgGridReact
                columnDefs={this.columnArray}
                rowModelType='infinite'
                cacheBlockSize={this.props.cacheBlockSize}
                maxBlocksInCache={this.props.maxBlocksInCache}
                blockLoadDebounceMillis={this.props.blockLoadDebounce}
                debug={this.debugMode}
                onGridReady={this.onGridReady}
                onCellClicked={this.onEventClick}
                rowSelection='multiple'
                onModelUpdated={this.onModelUpdated}
                onCellKeyDown={this.onKeyDown}
                frameworkComponents={this.frameworkComponents}
                enableBrowserTooltips={true}
            >
            </AgGridReact>
        </div>;
    }

    resultsAreEmpty(): boolean {
        return this.state.tableColumns.length === 0;
    }

    componentDidMount(): void {
        this.props.unitController.onSelectionRangeChange(range => { this.handleTimeSelectionChange(range); });
    }

    private checkFocus(event: React.FocusEvent<HTMLDivElement, Element>): void {
        if (!event.currentTarget?.contains(event.relatedTarget as Node)) {
            this.setFocus();
        }
    }

    setFocus(): void {
        if (document.getElementById(this.props.traceId + this.props.outputDescriptor.id + 'focusContainer')) {
            document.getElementById(this.props.traceId + this.props.outputDescriptor.id + 'focusContainer')?.focus();
        } else {
            document.getElementById(this.props.traceId + this.props.outputDescriptor.id)?.focus();
        }
    }

    componentWillUnmount(): void {
        // TODO: replace with removing the handler from unit controller
        // See timeline-chart issue #98
        // In the meantime, replace the handler with a noop on unmount
        this.handleTimeSelectionChange = () => Promise.resolve();
    }

    async componentDidUpdate(prevProps: TableOutputProps, _prevState: TableOuputState): Promise<void> {
        if (this.props.nbEvents !== prevProps.nbEvents) {
            this.gridApi?.setInfiniteRowCount(this.props.nbEvents);
        }
    }

    private onEventClick(event: CellClickedEvent) {
        const columns = event.columnApi.getAllColumns();
        const data = event.data;
        const mouseEvent = event.event as MouseEvent;
        const gridApi = event.api;
        const rowIndex = event.rowIndex;
        const itemPropsObj = this.fetchItemProperties(columns, data);
        signalManager().fireTooltipSignal(itemPropsObj);

        const currTimestamp = (this.timestampCol && data) ? data[this.timestampCol] : undefined;
        this.enableIndexSelection = true;
        if (mouseEvent.shiftKey) {
            if (this.selectStartIndex === -1) {
                this.selectStartIndex = rowIndex;
                if (currTimestamp) {
                    this.startTimestamp = BigInt(currTimestamp);
                }
            }
            this.selectEndIndex = rowIndex;
            if (currTimestamp) {
                this.endTimestamp = BigInt(currTimestamp);
            }
            this.selectRows();
        } else {
            if (mouseEvent.ctrlKey || mouseEvent.metaKey) {
                gridApi.deselectAll();
                const rowNode = gridApi.getRowNode(String(rowIndex));
                if (rowNode && rowNode.id) {
                    rowNode.setSelected(true);
                }
            }
            this.selectStartIndex = this.selectEndIndex = rowIndex;
            if (currTimestamp) {
                this.startTimestamp = this.endTimestamp = BigInt(currTimestamp);
            }
        }
        this.handleRowSelectionChange();
    }

    private fetchItemProperties(columns: Column[], data: any) {
        const itemPropsObj: { [key: string]: string } = {};
        columns.forEach(column => {
            const headerName = column.getColDef().headerName;
            const colField = column.getColDef().field;
            if (headerName && colField && data && data[colField]) {
                itemPropsObj[headerName] = data[colField];
            }
        });
        return itemPropsObj;
    }

    private onKeyDown(event: CellKeyDownEvent) {
        const gridApi = event.api;
        const keyEvent = event.event as KeyboardEvent;
        const rowIndex = event.rowIndex;
        this.enableIndexSelection = true;
        const currTimestamp = (this.timestampCol && event.data) ? event.data[this.timestampCol] : undefined;

        if (gridApi) {
            const currentRow = gridApi.getRowNode(String(rowIndex));

            let isContiguous = true;
            if (keyEvent.shiftKey) {
                if (keyEvent.code === 'ArrowDown') {
                    if (!currentRow.isSelected()) {
                        gridApi.deselectAll();
                        isContiguous = false;
                    }

                    const nextRow = gridApi.getRowNode(String(rowIndex + 1));
                    if (isContiguous === false) {
                        if (this.timestampCol && nextRow.data) {
                            this.startTimestamp = this.endTimestamp = BigInt(nextRow.data[this.timestampCol]);
                        }
                        this.selectStartIndex = this.selectEndIndex = nextRow.rowIndex;
                    } else {
                        if (this.selectEndIndex < this.selectStartIndex) {
                            if (currentRow && currentRow.id) {
                                currentRow.setSelected(false);
                            }
                        } else {
                            if (nextRow && nextRow.id) {
                                nextRow.setSelected(true);
                            }
                        }
                        this.selectEndIndex += 1;
                        if (this.timestampCol && nextRow.data) {
                            this.endTimestamp = BigInt(nextRow.data[this.timestampCol]);
                        }
                    }
                    this.handleRowSelectionChange();
                } else if (keyEvent.code === 'ArrowUp') {
                    if (!currentRow.isSelected()) {
                        gridApi.deselectAll();
                        isContiguous = false;
                    }
                    const nextRow = gridApi.getRowNode(String(rowIndex - 1));

                    if (isContiguous === false) {
                        if (this.timestampCol && nextRow.data) {
                            this.startTimestamp = this.endTimestamp = BigInt(nextRow.data[this.timestampCol]);
                        }
                        this.selectStartIndex = this.selectEndIndex = nextRow.rowIndex;
                    } else {
                        if (this.selectStartIndex < this.selectEndIndex) {
                            if (currentRow && currentRow.id) {
                                currentRow.setSelected(false);
                            }
                        } else {
                            if (nextRow && nextRow.id) {
                                nextRow.setSelected(true);
                            }
                        }
                        this.selectEndIndex -= 1;
                        if (this.timestampCol && nextRow.data) {
                            this.endTimestamp = BigInt(nextRow.data[this.timestampCol]);
                        }
                    }
                    this.handleRowSelectionChange();

                } else if (keyEvent.code === 'Space') {
                    this.selectEndIndex = rowIndex;
                    if (currTimestamp) {
                        this.endTimestamp = BigInt(currTimestamp);
                    }
                    this.selectRows();
                    this.handleRowSelectionChange();
                }
            } else if (keyEvent.code === 'Space') {
                gridApi.deselectAll();
                if (currentRow && currentRow.id) {
                    currentRow.setSelected(true);
                }
                this.selectStartIndex = this.selectEndIndex = rowIndex;
                this.startTimestamp = this.endTimestamp = BigInt(currTimestamp);
                this.handleRowSelectionChange();
            }
        }
    }

    private onGridReady = async (event: GridReadyEvent) => {
        this.gridApi = event.api;
        this.columnApi = event.columnApi;
        event.api.setDatasource(this.dataSource);
    };

    private async init() {
        const traceUUID = this.props.traceId;
        const tspClient = this.props.tspClient;
        const outputId = this.props.outputDescriptor.id;

        // Fetch columns
        const tspClientResponse = await tspClient.fetchTableColumns(traceUUID, outputId, QueryHelper.timeQuery([BigInt(0), BigInt(1)]));
        const columnsResponse = tspClientResponse.getModel();

        if (!tspClientResponse.isOk() || !columnsResponse) {
            this.setState({
                outputStatus: ResponseStatus.FAILED
            });
            return;
        }

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

        const columnEntries = columnsResponse.model;
        columnEntries.forEach(columnHeader => {
            const id = this.showIndexColumn ? ++columnHeader.id : columnHeader.id;
            colIds.push(id);
            columnsArray.push({
                headerName: columnHeader.name,
                field: columnHeader.id.toString(),
                width: this.props.columnWidth,
                resizable: true,
                cellRenderer: 'cellRenderer',
                cellRendererParams: {
                    filterModel: this.filterModel,
                    searchResultsColor: this.props.backgroundTheme === 'light' ? '#cccc00' : '#008000'
                },
                suppressMenu: true,
                filter: 'agTextColumnFilter',
                floatingFilter: true,
                floatingFilterComponent: 'searchFilterRenderer',
                floatingFilterComponentParams: {
                    suppressFilterButton: true,
                    onFilterChange: this.searchEvents,
                    onclickNext: () => this.findMatchedEvent(Direction.NEXT),
                    onclickPrevious: () => this.findMatchedEvent(Direction.PREVIOUS),
                    colName: columnHeader.id.toString()
                },
                icons: {
                    filter: ''
                },
                tooltipField: columnHeader.id.toString()
            });
        });

        if (!this.showIndexColumn) {
            columnsArray[0].cellRenderer = 'cellRenderer';
        }

        this.columnIds = colIds;
        this.columnArray = columnsArray;

        this.setState({
            outputStatus: columnsResponse.status,
            tableColumns: this.columnArray
        });

        if (this.columnApi) {
            const columns = this.columnApi.getAllColumns();
            const timestampHeader = columns.find(column => column.getColDef().headerName === 'Timestamp ns');
            if (timestampHeader) {
                this.timestampCol = timestampHeader.getColDef().field;
            }
        }

        if (this.props.unitController.selectionRange) {
            this.handleTimeSelectionChange(this.props.unitController.selectionRange);
        }
    }

    private handleRowSelectionChange() {
        if (this.timestampCol) {
            const startTimestamp = String(this.startTimestamp);
            const endTimestamp = String(this.endTimestamp);
            const payload = { startTimestamp, endTimestamp };
            this.prevStartTimestamp = BigInt(startTimestamp);
            this.eventSignal = true;
            signalManager().fireSelectionChangedSignal(payload);
        }
    }

    private async handleTimeSelectionChange(range?: TimelineChart.TimeGraphRange) {
        if (range) {
            if (this.eventSignal) {
                this.eventSignal = false;
                return;
            }

            this.startTimestamp = this.props.range.getStart() + range.start;
            this.endTimestamp = this.props.range.getStart() + range.end;

            if (this.startTimestamp === this.endTimestamp || !this.timestampCol) {
                this.enableIndexSelection = true;
            } else {
                this.enableIndexSelection = false;
            }

            if (this.gridApi && this.startTimestamp !== this.prevStartTimestamp) {
                this.prevStartTimestamp = this.startTimestamp;
                this.selectStartIndex = this.selectEndIndex = -1;
                this.gridApi.deselectAll();

                const index = await this.fetchTableIndex(this.startTimestamp > this.endTimestamp ? this.startTimestamp + BigInt(1) : this.startTimestamp);
                if (index) {
                    const startIndex = this.startTimestamp > this.endTimestamp ? index - 1 : index;
                    this.selectStartIndex = this.selectStartIndex === -1 ? startIndex : this.selectStartIndex;
                    this.selectEndIndex = (this.enableIndexSelection && this.selectEndIndex === -1) ? startIndex : this.selectEndIndex;
                    this.gridApi.ensureIndexVisible(this.selectStartIndex);
                    this.selectRows();
                }
            } else {
                this.selectRows();
            }
        }

    }

    private async fetchTableIndex(timestamp: bigint) {
        const traceUUID = this.props.traceId;
        const tspClient = this.props.tspClient;
        const outputId = this.props.outputDescriptor.id;
        const tspClientResponse = await tspClient.fetchTableLines(traceUUID, outputId,
            QueryHelper.timeQuery([timestamp], { [QueryHelper.REQUESTED_TABLE_COUNT_KEY]: 1 }));
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

    private fetchAdditionalParams(direction?: Direction): ({ [key: string]: any }) {
        let additionalParams: { [key: string]: any } = {};
        const filterObj: { [key: number]: string } = {};
        if (this.filterModel) {
            this.filterModel.forEach((value: string, key: string) => {
                const k: number = Number.parseInt(key);
                filterObj[k] = value;
            });
            additionalParams = {
                ['table_search_expressions']: filterObj,
            };
            if (direction !== undefined) {
                additionalParams['table_search_direction'] = Direction[direction];
            }
        }
        return additionalParams;

    }

    private async fetchSearchTableLines(fetchIndex: number, linesToFetch: number) {
        const traceUUID = this.props.traceId;
        const tspClient = this.props.tspClient;
        const outputId = this.props.outputDescriptor.id;

        const additionalParams = this.fetchAdditionalParams();
        const tspClientResponse = await tspClient.fetchTableLines(traceUUID, outputId, QueryHelper.tableQuery(this.columnIds, fetchIndex, linesToFetch, additionalParams));
        const lineResponse = tspClientResponse.getModel();
        const linesArray = new Array<Line>();
        if (!tspClientResponse.isOk() || !lineResponse) {
            return linesArray;
        }
        const model = lineResponse.model;
        const lines = model.lines;
        lines.forEach(line => {
            const obj: any = {};
            const cells = line.cells;
            const columnIds = model.columnIds;

            if (this.showIndexColumn) {
                obj[0] = line.index.toString();
            }

            cells.forEach((cell, index) => {
                const id = this.showIndexColumn ? columnIds[index] + 1 : columnIds[index];
                obj[id] = cell.content;
            });

            obj['isMatched'] = (line.tags !== undefined && line.tags > 0);
            linesArray.push(obj);
        });

        return linesArray;
    }

    private onModelUpdated = async () => {
        this.selectRows();

        if (this.columnArray.length > 0 && !this.columnsPacked && this.columnApi) {
            this.columnApi.autoSizeAllColumns();
            this.columnsPacked = true;
        }
    };

    private searchEvents(colName: string, filterValue: string) {
        if (filterValue === '') {
            this.filterModel.delete(colName);
        } else {
            this.filterModel.set(colName, filterValue);
        }
        if (this.gridApi) {
            this.gridApi.forEachNode(rowNode => {
                let isMatched = true;
                this.filterModel.forEach((value, key) => {
                    if ((rowNode.data[key].search(new RegExp(value)) === -1)) {
                        isMatched = false;
                    }
                });
                rowNode.data['isMatched'] = isMatched;
            });
            this.gridApi.redrawRows();
        }
    }

    private async findMatchIndex(currRowIndex: number, direction = Direction.NEXT) {
        const traceUUID = this.props.traceId;
        const tspClient = this.props.tspClient;
        const outputId = this.props.outputDescriptor.id;
        const additionalParams = this.fetchAdditionalParams(direction);
        const tspClientResponse = await tspClient.fetchTableLines(traceUUID, outputId, QueryHelper.tableQuery(this.columnIds, currRowIndex, 1, additionalParams));
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

    private async findMatchedEvent(direction: Direction) {
        let isFound = false;
        if (this.gridApi) {

            // make sure that both index are either both -1 or both have a valid number
            if (this.selectStartIndex !== -1 && this.selectEndIndex === -1) {
                this.selectEndIndex = this.selectStartIndex;
            }
            if (this.selectEndIndex !== -1 && this.selectStartIndex === -1) {
                this.selectStartIndex = this.selectStartIndex;
            }

            let currRowIndex = 0;
            if (this.selectStartIndex !== -1) {
                if (direction === Direction.NEXT) {
                    currRowIndex = Math.max(this.selectStartIndex, this.selectEndIndex) + 1;
                } else {
                    currRowIndex = Math.min(this.selectStartIndex, this.selectEndIndex) - 1;
                }
            } else if (direction === Direction.PREVIOUS) {
                // no backward search if there is no selection
                return;
            }

            let rowNodes: RowNode[] = [];
            this.gridApi.forEachNode(rowNode => {
                rowNodes.push(rowNode);
            });

            if (direction === Direction.PREVIOUS) {
                rowNodes = rowNodes.reverse();
            }

            this.gridApi.deselectAll();
            // consider only rows starting from the current row index and contiguous rows after that
            let currRowIndexFound = false;
            rowNodes.forEach(rowNode => {
                if (rowNode.rowIndex === currRowIndex) {
                    currRowIndexFound = true;
                    // update current row index to next/previous contiguous row
                    if (direction === Direction.NEXT) {
                        currRowIndex++;
                    } else {
                        currRowIndex--;
                    }
                } else {
                    // non-contiguous row found, stop searching in cache
                    currRowIndexFound = false;
                }
                if (currRowIndexFound && !isFound && rowNode.data && rowNode.data['isMatched']) {
                    this.gridApi?.ensureIndexVisible(rowNode.rowIndex);
                    this.selectStartIndex = this.selectEndIndex = rowNode.rowIndex;
                    this.handleRowSelectionChange();
                    rowNode.setSelected(true);
                    isFound = true;
                }
            });

            if (isFound) {
                // match found in cache
                return;
            }
            // find match outside the cache
            if (currRowIndex >= 0) {
                const lineIndex = await this.findMatchIndex(currRowIndex, direction);
                if (lineIndex !== undefined) {
                    this.gridApi.ensureIndexVisible(lineIndex);
                    this.selectStartIndex = this.selectEndIndex = lineIndex;
                }
            }

            // apply new or previous selection
            if (this.selectStartIndex !== -1 && this.selectEndIndex !== -1) {
                this.handleRowSelectionChange();
                this.enableIndexSelection = true;
                this.selectRows();
            }
        }
    }

    private isValidRowSelection(rowNode: RowNode): boolean {
        if ((this.enableIndexSelection && this.selectStartIndex !== -1 && this.selectEndIndex !== -1 && rowNode.rowIndex >= Math.min(this.selectStartIndex, this.selectEndIndex)
            && rowNode.rowIndex <= Math.max(this.selectStartIndex, this.selectEndIndex)) || (!this.enableIndexSelection
                && this.timestampCol && BigInt(rowNode.data[this.timestampCol]) >= (this.startTimestamp <= this.endTimestamp ? this.startTimestamp : this.endTimestamp)
                && BigInt(rowNode.data[this.timestampCol]) <= (this.startTimestamp <= this.endTimestamp ? this.endTimestamp : this.startTimestamp))) {
            return true;
        }
        return false;
    }

    private selectRows(): void {
        if (this.gridApi) {
            this.gridApi.forEachNode(rowNode => {
                if (rowNode.id) {
                    rowNode.setSelected(this.isValidRowSelection(rowNode));
                }
            });
        }
    }
}
