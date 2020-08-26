import * as React from 'react';
import { TreeNode } from './tree-node';
import { TableHeader } from './table-header';
import { TableBody } from './table-body';
import { SortConfig, sortState, nextSortState, sortNodes } from './sort';

interface TableProps {
    nodes: TreeNode[];
    collapsedNodes: number[];
    isCheckable: boolean;
    sortConfig: SortConfig[];
    getCheckedStatus: (id: number) => number;
    onToggleCollapse: (id: number) => void;
    onToggleCheck: (id: number) => void;
    onSort: (sortedNodes: TreeNode[]) => void;
    onSortConfigChange: (sortConfig: SortConfig[]) => void;
}

export class Table extends React.Component<TableProps> {
    private keys: string[] = [];
    private sortableColumns: string[] = [];

    constructor(props: TableProps) {
        super(props);
        this.keys = this.getTableHeaderKeys();
        this.sortableColumns = this.getSortableColumns();
        this.initializeSortConfig();
    }

    initializeSortConfig = (): void => {
        const config: SortConfig[] = [];
        this.sortableColumns.forEach((column: string) => {
            config.push({column: column, sortState: sortState.default});
        });
        this.props.onSortConfigChange(config);
    };

    getTableHeaderKeys = (): string[] => {
        const keys = Object.keys(this.props.nodes[0]);
        const excludeKeys = ['isRoot', 'children', 'style', 'metadata', 'labels', 'id', 'parentId'];
        return keys.filter(key => !excludeKeys.includes(key)).concat('Legend');
    };

    getSortableColumns = (): string[] => {
        const sortableColumns: string[] = [];
        this.keys.forEach((key: string) => {
            if (typeof this.props.nodes[0][key as keyof TreeNode] === 'string' || typeof this.props.nodes[0][key as keyof TreeNode] === 'number') {
                sortableColumns.push(key);
            }
        });
        return sortableColumns;
    };

    onSortChange = (sortColumn: string): void => {
        let newSortConfigs: SortConfig[] = [...this.props.sortConfig];
        newSortConfigs = newSortConfigs.map((config: SortConfig) => {
            if (config.column === sortColumn) {
                return {...config, sortState: nextSortState(config.sortState)};
            } else {
                return {...config, sortState: sortState.default};
            }
        });
        const newSortedNodes = sortNodes(this.props.nodes, newSortConfigs);
        this.props.onSortConfigChange(newSortConfigs);
        this.props.onSort(newSortedNodes);
    };

    render(): JSX.Element {
        return (
            <div>
                <table style={{borderCollapse: 'collapse'}} className="table-tree">
                    <TableHeader
                        columns={this.keys}
                        sortableColumns={this.sortableColumns}
                        onSort={this.onSortChange}
                        sortConfig={this.props.sortConfig}
                    />
                    <TableBody
                        {...this.props}
                        nodes={sortNodes(this.props.nodes, this.props.sortConfig)}
                        keys={this.keys}
                    />
                </table>
            </div>
        );
    }
}
