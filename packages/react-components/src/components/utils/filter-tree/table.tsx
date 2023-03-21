import * as React from 'react';
import { TreeNode } from './tree-node';
import { TableHeader } from './table-header';
import { TableBody } from './table-body';
import { SortConfig, sortState, nextSortState, sortNodes } from './sort';
import ColumnHeader from './column-header';

interface TableProps {
    nodes: TreeNode[];
    selectedRow?: number;
    collapsedNodes: number[];
    isCheckable: boolean;
    isClosable: boolean;
    sortConfig: SortConfig[];
    onRowClick: (id: number) => void;
    onContextMenu: (event: React.MouseEvent<HTMLDivElement>, id: number) => void;
    getCheckedStatus: (id: number) => number;
    onToggleCollapse: (id: number) => void;
    onToggleCheck: (id: number) => void;
    onClose: (id: number) => void;
    onSort: (sortedNodes: TreeNode[]) => void;
    onSortConfigChange: (sortConfig: SortConfig[]) => void;
    showHeader: boolean;
    headers: ColumnHeader[];
    className: string;
}

export class Table extends React.Component<TableProps> {

    private sortableColumns: string[];

    constructor(props: TableProps) {
        super(props);
        const sortableCols: string[] = [];
        const config: SortConfig[] = [];
        this.props.headers.forEach((header: ColumnHeader, columnIndex) => {
            if (header.sortable) {
                config.push({ column: header.title, columnIndex: columnIndex, sortState: sortState.default });
                sortableCols.push(header.title);
            }
        });
        this.props.onSortConfigChange(config);
        this.sortableColumns = sortableCols;
    }

    onSortChange = (sortColumn: string): void => {
        let newSortConfigs: SortConfig[] = [...this.props.sortConfig];
        newSortConfigs = newSortConfigs.map((config: SortConfig) => {
            if (config.column === sortColumn) {
                return { ...config, sortState: nextSortState(config.sortState) };
            } else {
                return { ...config, sortState: sortState.default };
            }
        });
        const newSortedNodes = sortNodes(this.props.nodes, newSortConfigs);
        this.props.onSortConfigChange(newSortConfigs);
        this.props.onSort(newSortedNodes);
    };

    render(): JSX.Element {
        const gridTemplateColumns = this.props.headers.map(() => 'max-content').join(' ').concat(' minmax(0px, 1fr)');
        return (
            <div>
                <table style={{ gridTemplateColumns: gridTemplateColumns }} className={this.props.className}>
                    {this.props.showHeader && <TableHeader
                        columns={this.props.headers}
                        sortableColumns={this.sortableColumns}
                        onSort={this.onSortChange}
                        sortConfig={this.props.sortConfig}
                    />}
                    <TableBody
                        {...this.props}
                        nodes={sortNodes(this.props.nodes, this.props.sortConfig)}
                    />
                </table>
            </div>
        );
    }
}
