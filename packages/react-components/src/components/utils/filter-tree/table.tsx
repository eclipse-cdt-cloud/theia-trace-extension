import * as React from 'react';
import { TreeNode } from './tree-node';
import { TableHeader } from './table-header';
import { TableBody } from './table-body';
import { SortConfig, sortState, nextSortState, sortNodes } from './sort';
import ColumnHeader from './column-header';
import { filterEmptyNodes } from './utils';

interface TableProps {
    nodes: TreeNode[];
    selectedRow?: number;
    multiSelectedRows?: number[];
    collapsedNodes: number[];
    isCheckable: boolean;
    isClosable: boolean;
    sortConfig: SortConfig[];
    onRowClick: (id: number) => void;
    onMultipleRowClick?: (id: number, isShiftClicked?: boolean) => void;
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
    hideFillers?: boolean;
    emptyNodes: number[];
    hideEmptyNodes: boolean;
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
        let gridTemplateColumns = this.props.headers
            .map((_header, index) => {
                if (index === this.props.headers.length - 1) {
                    if (this.props.hideFillers) {
                        return 'auto';
                    }
                }
                return 'max-content';
            })
            .join(' ');
        if (!this.props.hideFillers) {
            gridTemplateColumns = gridTemplateColumns.concat(' minmax(0px, 1fr)');
        }

        let nodes = sortNodes(this.props.nodes, this.props.sortConfig);

        if (this.props.hideEmptyNodes) {
            nodes = filterEmptyNodes(nodes, this.props.emptyNodes);
        }

        return (
            <div>
                <table style={{ gridTemplateColumns: gridTemplateColumns }} className={this.props.className}>
                    {this.props.showHeader && (
                        <TableHeader
                            columns={this.props.headers}
                            sortableColumns={this.sortableColumns}
                            onSort={this.onSortChange}
                            sortConfig={this.props.sortConfig}
                            hideFillers={this.props.hideFillers}
                        />
                    )}
                    <TableBody {...this.props} nodes={nodes} />
                </table>
            </div>
        );
    }
}
