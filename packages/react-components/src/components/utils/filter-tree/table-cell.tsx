import * as React from 'react';
import { TreeNode } from './tree-node';

interface TableCellProps {
    node: TreeNode;
    index: number;
    children?: React.ReactNode | React.ReactNode[];
}

export class TableCell extends React.Component<TableCellProps> {
    constructor(props: TableCellProps) {
        super(props);
    }
    render(): React.ReactNode {
        const { node, index } = this.props;
        const content = node.labels[index];

        return (
            <td key={this.props.index+'-td-'+this.props.node.id}>
                <span>
                    {this.props.children}
                    {content}
                </span>
            </td>
        );
    }
}
