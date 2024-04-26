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

        let content;
        if (node.elementIndex && node.elementIndex === index && node.getElement) {
            content = node.getElement();
        } else {
            content = node.labels[index];
        }

        const title = node.showTooltip ? node.labels[index] : undefined;

        return (
            <td key={this.props.index + '-td-' + this.props.node.id}>
                <span title={title}>
                    {this.props.children}
                    {content}
                </span>
            </td>
        );
    }
}
