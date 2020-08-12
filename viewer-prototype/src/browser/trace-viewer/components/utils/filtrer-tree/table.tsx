import * as React from 'react';
import { TreeNode } from './tree-node';
import { TableHeader } from './table-header';
import { TableBody } from './table-body';
import { SortConfig, sortState, nextSortState, sortNodes } from './sort';

interface TableProps {
    nodes: TreeNode[];
    collapsedNodes: number[];
    isCheckable: boolean;
    getCheckedStatus: (id: number) => number;
    onToggleCollapse: (id: number) => void;
    onToggleCheck: (id: number) => void;
}

interface TableState {
    sortedNodes: TreeNode[];
    sortConfig: SortConfig[];
}

export class Table extends React.Component<TableProps, TableState> {
    private keys: string[] = [];
    private sortableColumns: string[] = [];

    constructor(props: TableProps) {
        super(props);
        this.keys = this.getTableHeaderKeys();
        this.sortableColumns = this.getSortableColumns();
        this.state = {
            sortedNodes: this.props.nodes,
            sortConfig: this.initializeSortConfig()
        };
    }

    initializeSortConfig = (): SortConfig[] => {
        const config: SortConfig[] = [];
        this.sortableColumns.forEach((column: string) => {
            config.push({column: column, sortState: sortState.default});
        });
        return config;
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
        let newSortConfigs: SortConfig[] = [...this.state.sortConfig];
        newSortConfigs = newSortConfigs.map((config: SortConfig) => {
            if (config.column === sortColumn) {
                return {...config, sortState: nextSortState(config.sortState)};
            } else {
                return {...config, sortState: sortState.default};
            }
        });
        const newSortedNodes = this.sortNodes(newSortConfigs);
        this.setState({sortedNodes: newSortedNodes, sortConfig: newSortConfigs});
    };

    sortNodes = (sortConfigs: SortConfig[]): TreeNode[] => {
        const orderToSort = sortConfigs.find((config: SortConfig) => config.sortState !== sortState.default);
        if (orderToSort) {
            return sortNodes(this.props.nodes, orderToSort);
        } else {
            return this.props.nodes;
        }
    };

    render(): JSX.Element {
        return (
            <div>
                <table style={{borderCollapse: 'collapse'}} className="table-tree">
                    <TableHeader
                        columns={this.keys}
                        sortableColumns={this.sortableColumns}
                        onSort={this.onSortChange}
                        sortConfig={this.state.sortConfig}
                    />
                    <TableBody
                        {...this.props}
                        nodes={this.sortNodes(this.state.sortConfig)}
                        keys={this.keys}
                    />
                </table>
            </div>
        );
    }
}
