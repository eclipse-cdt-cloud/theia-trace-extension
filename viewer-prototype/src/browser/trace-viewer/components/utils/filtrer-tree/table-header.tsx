import * as React from 'react';

interface TableHeaderProps {
    columns: string[];
}

export class TableHeader extends React.Component<TableHeaderProps> {
    constructor(props: TableHeaderProps) {
        super(props);
    }

    toCapitalCase = (name: string): string => (name.charAt(0).toUpperCase() + name.slice(1));

    renderHeader = (): React.ReactNode => this.props.columns.map((column: string, index) => <th key={'th-'+index}>{this.toCapitalCase(column)}</th>);

    render(): React.ReactNode {
        return <thead>
            <tr>
                {this.renderHeader()}
            </tr>
        </thead>;
    }
}
