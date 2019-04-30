import { AbstractOutputComponent, AbstractOutputProps, AbstractOutputState } from "./abstract-output-component";
import * as React from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ColDef } from "ag-grid-community";
import { Entry, EntryHeader } from "tsp-typescript-client/lib/models/entry";
import { QueryHelper } from 'tsp-typescript-client/lib/models/query/query-helper';

type TableOuputState = AbstractOutputState & {
    tableColumns: ColDef[];
    tableLines: any[];
}

export class TableOutputComponent extends AbstractOutputComponent<AbstractOutputProps, TableOuputState> {

    constructor(props: AbstractOutputProps) {
        super(props);
        this.state = {
            outputStatus: 'RUNNING',
            tableColumns: [],
            tableLines: []
        };
        this.updateTable();
    }

    renderMainArea(): React.ReactNode {
        return <div id='events-table' className='ag-theme-balham-dark' style={{ height: '300px', width: '100%' }}>
            <AgGridReact
                columnDefs={this.state.tableColumns}
                rowData={this.state.tableLines}>
            </AgGridReact>
        </div>;
    }

    private async updateTable() {
        const traceUUID = this.props.traceId;
        const tspClient = this.props.tspClient;
        const outPutId = this.props.outputDescriptor.id;

        // Fetch columns
        const columnsResponse = (await tspClient.fetchTableColumns<Entry, EntryHeader>(traceUUID, outPutId, QueryHelper.timeQuery([0, 1]))).getModel();
        const columnEntries = columnsResponse.model.entries;
        const columnIds: Array<number> = new Array;
        const columnsArray = new Array<any>();
        columnEntries.forEach(entry => {
            columnIds.push(entry.id);
            let columnName = '';
            if (entry.labels.length) {
                columnName = entry.labels[0];
            }
            columnsArray.push({
                headerName: columnName,
                field: entry.id.toString(),
                width: 200
            });
        });

        // Fetch lines
        const lineResponse = (await tspClient.fetchTableLines(traceUUID, outPutId, QueryHelper.tableQuery(columnIds, 0, 500))).getModel();
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

        this.setState({
            outputStatus: lineResponse.status,
            tableColumns: columnsArray,
            tableLines: linesArray
        })
    }
}