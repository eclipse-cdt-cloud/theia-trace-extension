import * as React from 'react';
import { TreeNode } from './tree-node';

interface TableCellProps {
    nodeKey: string;
    node: TreeNode;
}

export class TableCell extends React.Component<TableCellProps> {
    constructor(props: TableCellProps) {
        super(props);
    }

    render(): React.ReactNode {
        const content: React.ReactNode = (this.props.nodeKey !== 'Legend')
            ? this.props.node[this.props.nodeKey as keyof TreeNode]
            : undefined;
        return (
            <td key={this.props.nodeKey+'-'+this.props.node.id}>
                {this.props.children}
                {content}
            </td>
        );
    }
}
