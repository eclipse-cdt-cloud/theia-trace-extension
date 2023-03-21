import * as React from 'react';
import { TreeNode } from './tree-node';
import { TableRow } from './table-row';

interface TableBodyProps {
    nodes: TreeNode[];
    selectedNode?: number;
    collapsedNodes: number[];
    isCheckable: boolean;
    isClosable: boolean;
    getCheckedStatus: (id: number) => number;
    onToggleCollapse: (id: number) => void;
    onRowClick: (id: number) => void;
    onClose: (id: number) => void;
    onToggleCheck: (id: number) => void;
    onContextMenu: (event: React.MouseEvent<HTMLDivElement>, id: number) => void;
}

export class TableBody extends React.Component<TableBodyProps> {
    constructor(props: TableBodyProps) {
        super(props);
    }

    createRow = (node: TreeNode): React.ReactNode =>
        <TableRow
            {...this.props}
            key={'row-' + node.id}
            node={node}
            level={0}
        />;

    renderRows = (): React.ReactNode => this.props.nodes.map((node: TreeNode) => this.createRow(node));

    render(): React.ReactNode | undefined {
        if (!this.props.nodes) { return undefined; }

        return (
            <tbody>
                {this.renderRows()}
            </tbody>
        );
    }
}
