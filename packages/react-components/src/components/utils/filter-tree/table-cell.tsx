import * as React from 'react';
import { TreeNode } from './tree-node';
import { signalManager } from 'traceviewer-base/lib/signals/signal-manager';

interface TableCellProps {
    node: TreeNode;
    index: number;
    onRowClick: (id: number) => void;
    selectedRow?: number;
    outputDescriptorId?: string;
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

    private onContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        if (this.props.outputDescriptorId) {
            signalManager().fireDatatreeOutputOpenContextMenu({
                xPos: e.clientX,
                yPos: e.clientY,
                nodeId: this.props.node.id,
                cellIndex: this.props.index,
                outputId: this.props.outputDescriptorId
            })
        }
    }

    render(): React.ReactNode {
        const { node, selectedRow, index } = this.props;
        const content = node.labels[index];
        const className = (selectedRow === node.id) ? 'selected' : '';

        return (
            <td 
                key={this.props.index+'-td-'+this.props.node.id}
                onClick={this.onClick}
                className={className}
                onContextMenu={this.onContextMenu}
            >
                <span>
                    {this.props.children}
                    {content}
                </span>
            </td>
        );
    }
}
