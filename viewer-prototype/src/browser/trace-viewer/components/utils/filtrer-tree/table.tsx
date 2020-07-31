/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from 'react';
import { Entry } from 'tsp-typescript-client/lib/models/entry';

interface TableProps {
    entries: Entry[];
}

export class Table extends React.Component<TableProps> {
    constructor(props: TableProps) {
        super(props);
    }

    renderTableHeader(): React.ReactNode {
        const header = ['Process', 'TID', 'Time', 'Legend'];
        return header.map((title, index) => <th key={index}>{title}</th>);
    }

    renderTableData(): React.ReactNode {
        return this.props.entries.map((entry: Entry) => {
            const { id, name, tid, time } = (entry as any);
            return (
                <tr key={id}>
                    <td>{name}</td>
                    <td>{tid}</td>
                    <td>{time}</td>
                    <td>{}</td>
                </tr>
            );
        });
    }

    render(): JSX.Element {
        return (
            <div>
                <table style={{borderCollapse: 'collapse'}} className="table-tree">
                    <tbody>
                        <tr>{this.renderTableHeader()}</tr>
                        {this.renderTableData()}
                    </tbody>
                </table>
            </div>
        );
    }

}
