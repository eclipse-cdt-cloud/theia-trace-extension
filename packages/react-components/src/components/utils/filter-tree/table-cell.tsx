import * as React from 'react';
import { TreeNode } from './tree-node';

interface TableCellProps {
    node: TreeNode;
    index: number;
    children?: React.ReactNode | React.ReactNode[];
    onRowClick: (id: number) => void;
    selectedRow?: number;
}

export class TableCell extends React.Component<TableCellProps> {
    constructor(props: TableCellProps) {
        super(props);
    }

    private onClick = () => {
        const { node, onRowClick } = this.props;
        if (onRowClick) {
            onRowClick(node.id);
        }
    };

    render(): React.ReactNode {
        const { node, selectedRow, index } = this.props;
        const content = node.labels[index];
        const className = (selectedRow === node.id) ? 'selected' : '';

        return (
            <td key={this.props.index+'-td-'+this.props.node.id} onClick={this.onClick} className={className}>
                <span>
                    {this.props.children}
                    {content}
                </span>
            </td>
        );
    }
}
