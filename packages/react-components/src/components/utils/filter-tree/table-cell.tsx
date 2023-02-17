import * as React from 'react';
import { TreeNode } from './tree-node';

interface TableCellProps {
    node: TreeNode;
    index: number;
    children?: React.ReactNode | React.ReactNode[];
    onRowClick: (id: number) => void;
    onCellClick: (id: number, index: number) => void;
    selectedRow?: number;
    clickable?: boolean;
}

export class TableCell extends React.Component<TableCellProps> {
    constructor(props: TableCellProps) {
        super(props);
    }

    private onClick = () => {
        const { node, onRowClick, onCellClick, index } = this.props;
        if (onRowClick) {
            onRowClick(node.id);
        }
        if (onCellClick) {
            onCellClick(node.id, index);
        }
    };

    render(): React.ReactNode {
        const { node, selectedRow, index, clickable } = this.props;
        const content = node.labels[index];
        let className = (selectedRow === node.id) ? 'selected' : '';
        // FIXME hardcoded
        if (index > 6) {
            className = clickable ? 'clickable' : className;
        }

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
