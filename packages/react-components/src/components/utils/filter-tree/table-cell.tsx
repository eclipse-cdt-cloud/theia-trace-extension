import * as React from 'react';
import { TreeNode } from './tree-node';

interface TableCellProps {
    node: TreeNode;
    index: number;
    selectedRow?: number;
    children?: React.ReactNode | React.ReactNode[];
}

export class TableCell extends React.Component<TableCellProps> {
    constructor(props: TableCellProps) {
        super(props);
    }

    render(): React.ReactNode {
        const { node, selectedRow, index } = this.props;
        const content = node.labels[index];
        const className = (selectedRow === node.id) ? 'selected' : '';

        return (
            <td key={this.props.index+'-td-'+this.props.node.id} className={className}>
                <span>
                    {this.props.children}
                    {content}
                </span>
            </td>
        );
    }
}
