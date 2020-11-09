import * as React from 'react';
import { TreeNode } from './tree-node';

interface TableCellProps {
    node: TreeNode;
    index: number;
}

export class TableCell extends React.Component<TableCellProps> {
    constructor(props: TableCellProps) {
        super(props);
    }

    render(): React.ReactNode {
        const content = this.props.node.labels[this.props.index];
        return (
            <td key={this.props.index+'-td-'+this.props.node.id}>
                {this.props.children}
                {content}
            </td>
        );
    }
}
