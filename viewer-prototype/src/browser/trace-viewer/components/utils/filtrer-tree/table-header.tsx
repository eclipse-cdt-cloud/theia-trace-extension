import * as React from 'react';
import { SortConfig } from './sort';

interface TableHeaderProps {
    columns: string[];
    sortableColumns: string[];
    sortConfig: SortConfig[];
    onSort: (sortColumn: string) => void;
}

export class TableHeader extends React.Component<TableHeaderProps> {
    constructor(props: TableHeaderProps) {
        super(props);
    }

    handleSortChange = (sortColumn: string): void => {
        this.props.onSort(sortColumn);
    };

    toCapitalCase = (name: string): string => (name.charAt(0).toUpperCase() + name.slice(1));

    renderSortIcon = (column: string): React.ReactNode | undefined => {
        if (this.props.sortableColumns.includes(column)) {
            const state = this.props.sortConfig.find((config: SortConfig) => config.column === column);
            return state
                ? <span style={{float: 'right'}}>{state.sortState}</span>
                : undefined;
        }
        return undefined;
    };

    renderHeader = (): React.ReactNode => this.props.columns.map((column: string, index) =>
        <th key={'th-'+index} onClick={() => this.handleSortChange(column)}>
            {this.toCapitalCase(column)}
            {this.renderSortIcon(column)}
        </th>
    );

    render(): React.ReactNode {
        return <thead>
            <tr>
                {this.renderHeader()}
            </tr>
        </thead>;
    }
}
