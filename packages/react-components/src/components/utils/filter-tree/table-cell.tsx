import * as React from 'react';
import { TreeNode } from './tree-node';

interface TableCellProps {
    node: TreeNode;
    index: number;
    selectedRow?: number;
    children?: React.ReactNode | React.ReactNode[];
    onRowClick: (id: number) => void;
}

export class TableCell extends React.Component<TableCellProps> {
    constructor(props: TableCellProps) {
        super(props);
    }

    onClick = (e: React.MouseEvent<HTMLTableDataCellElement, MouseEvent>) => {
        const { node, onRowClick } = this.props;
        onRowClick(node.id);
    }

    render(): React.ReactNode {
        const { node, selectedRow, index, onRowClick } = this.props;
        const content = node.labels[index];
        const className = (selectedRow === node.id) ? 'selected' : '';

        return (
            <td key={this.props.index+'-td-'+this.props.node.id} className={className} onClick={this.onClick}>
                <span>
                    {this.props.children}
                    {content}
                </span>
            </td>
        );
    }
}
