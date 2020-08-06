import * as React from 'react';
import { TreeNode } from './tree-node';
import { TableHeader } from './table-header';
import { TableBody } from './table-body';

interface TableProps {
    nodes: TreeNode[];
    collapsedNodes: number[];
    isCheckable: boolean;
    getCheckedStatus: (id: number) => number;
    onToggleCollapse: (id: number) => void;
    onToggleCheck: (id: number) => void;
}

export class Table extends React.Component<TableProps> {
    private keys: string[] = [];

    constructor(props: TableProps) {
        super(props);
        this.keys = this.getTableHeaderKeys();
    }

    getTableHeaderKeys = (): string[] => {
        const keys = Object.keys(this.props.nodes[0]);
        const excludeKeys = ['isRoot', 'children', 'style', 'metadata', 'labels', 'id', 'parentId'];
        return keys.filter(key => !excludeKeys.includes(key)).concat('Legend');
    };

    render(): JSX.Element {
        return (
            <div>
                <table style={{borderCollapse: 'collapse'}} className="table-tree">
                    <TableHeader columns={this.keys} />
                    <TableBody
                        {...this.props}
                        keys={this.keys}
                    />
                </table>
            </div>
        );
    }
}
