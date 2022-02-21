import * as React from 'react';
import { TreeNode } from './tree-node';
import { Message } from './message';
import { Filter } from './filter';
import { Table } from './table';
import { getAllExpandedNodeIds } from './utils';
import { SortConfig, sortNodes } from './sort';
import ColumnHeader from './column-header';
import { isEqual } from 'lodash';

interface FilterTreeProps {
    nodes: TreeNode[];
    showCheckboxes: boolean;
    showCloseIcons: boolean;
    showFilter: boolean;                    // Optional
    checkedSeries: number[];                // Optional
    collapsedNodes: number[];
    onToggleCheck: (ids: number[]) => void;     // Optional
    onClose: (id: number) => void;
    onToggleCollapse: (id: number, nodes: TreeNode[]) => void;
    onOrderChange: (ids: number[]) => void;
    showHeader: boolean;
    headers: ColumnHeader[];
    className: string;
}

interface FilterTreeState {
    filteredNodes: TreeNode[];
    sortConfig: SortConfig[];
}

export class FilterTree extends React.Component<FilterTreeProps, FilterTreeState> {
    static defaultProps: Partial<FilterTreeProps> = {
        checkedSeries: [],
        showFilter: true,
        onToggleCheck: () => { /* Nothing to do */ },
        onOrderChange: () => { /* Nothing to do */ },
    };

    constructor(props: FilterTreeProps) {
        super(props);
        this.state = {
            filteredNodes: this.props.nodes,
            sortConfig: []
        };
    }

    private _filter = '';

    getRootNodes = (): TreeNode[] => {
        const nodes = [...this.props.nodes];
        return nodes.filter((node: TreeNode) => node.isRoot === true);
    };

    getNode = (treeNodes: TreeNode[], id: number): TreeNode | undefined => {
        const nodes: TreeNode[] = [...treeNodes];
        if (!nodes) {
            return undefined;
        }
        let currentNode: TreeNode;
        while (nodes.length) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            currentNode = nodes.pop()!;
            if (currentNode.id === id) {
                return currentNode;
            } else {
                if (currentNode.children && currentNode.children.length) {
                    currentNode.children.forEach((child: TreeNode) => {
                        nodes.push(child);
                    });
                }
            }
        }
        return undefined;
    };

    handleCollapse = (id: number): void => {
        const nodes = sortNodes(this.state.filteredNodes, this.state.sortConfig);
        this.props.onToggleCollapse(id, nodes);
    };

    handleClose = (id: number): void => {
        this.props.onClose(id);
    };

    handleOrderChange = (nodes: TreeNode[]): void => {
        const ids = getAllExpandedNodeIds(nodes, this.props.collapsedNodes);
        this.props.onOrderChange(ids);
    };

    handleSortConfigChange = (sortConfig: SortConfig[]): void => {
        this.setState({ sortConfig: sortConfig });
    };

    getAllChildrenIds = (node: TreeNode, ids: number[]): number[] => {
        ids.push(node.id);
        if (node.children.length) {
            node.children.forEach((child: TreeNode) => {
                this.getAllChildrenIds(child, ids);
            });
        }
        return ids;
    };

    getParentIdsToCheck = (parentId: number, ids: number[], toCheck: boolean): number[] => {
        ids.push(parentId);
        const parentNode = this.getNode(this.props.nodes, parentId);
        if (parentNode) {
            if (toCheck && this.areAllSiblingsChecked(parentNode)) {
                this.getParentIdsToCheck(parentNode.parentId, ids, toCheck);
            } else if (!toCheck && this.isNodeChecked(parentNode.parentId)) {
                this.getParentIdsToCheck(parentNode.parentId, ids, toCheck);
            }
        }
        return ids;
    };

    isNodeChecked = (id: number): boolean => this.props.checkedSeries.includes(id);

    areAllSiblingsChecked = (node: TreeNode): boolean => {
        const parentNode = this.getNode(this.props.nodes, node.parentId);
        if (parentNode) {
            return parentNode.children.every((child: TreeNode) => this.isNodeChecked(child.id) || node.id === child.id);
        }
        return false;
    };

    handleCheck = (id: number): void => {
        let checkedIds: number[] = [];
        const checkedNode = this.getNode(this.props.nodes, id);
        if (checkedNode) {
            const childrenIds = this.getAllChildrenIds(checkedNode, []);
            const visibleChildrenIds = childrenIds.filter((childId: number) => this.getNode(this.state.filteredNodes, childId) !== undefined);
            if (!this.isNodeChecked(id)) {
                if (checkedNode.children.length) {
                    const childIdsToCheck = visibleChildrenIds.filter(childId => !this.isNodeChecked(childId));
                    checkedIds = checkedIds.concat(childIdsToCheck);
                } else {
                    checkedIds = checkedIds.concat(id);
                }
                if (this.areAllSiblingsChecked(checkedNode) && !this.isNodeChecked(checkedNode.parentId)) {
                    const parentsToCheck = this.getParentIdsToCheck(checkedNode.parentId, [], true);
                    checkedIds = checkedIds.concat(parentsToCheck);
                }
            } else {
                if (checkedNode.children.length) {
                    checkedIds = checkedIds.concat(visibleChildrenIds);
                } else {
                    checkedIds = checkedIds.concat(id);
                }
                if (this.isNodeChecked(checkedNode.parentId)) {
                    const parentsToCheck = this.getParentIdsToCheck(checkedNode.parentId, [], false);
                    checkedIds = checkedIds.concat(parentsToCheck);
                }
            }
            this.props.onToggleCheck(checkedIds);
        }
    };

    // returns 0 for unchecked, 1 for checked, 2 for half checked
    getCheckedStatus = (id: number): number => {
        const node = this.getNode(this.props.nodes, id);
        if (node) {
            if (node.children.length === 0) {
                return this.isNodeChecked(id) ? 1 : 0;
            } else {
                if (this.isEveryChildChecked(node)) {
                    return 1;
                }
                if (this.isSomeChildChecked(node)) {
                    return 2;
                }
            }
        }
        return 0;
    };

    isEveryChildChecked = (node: TreeNode): boolean => {
        const visibleNodes = node.children.filter((child: TreeNode) => this.getNode(this.state.filteredNodes, child.id) !== undefined);
        let allChildrenChecked = false;
        if (visibleNodes.length) {
            allChildrenChecked = visibleNodes.every((child: TreeNode) => {
                let isChecked = this.isNodeChecked(child.id);
                if (child.children.length) {
                    isChecked = isChecked && this.isEveryChildChecked(child);
                }
                return isChecked;
            });
        }
        const leaves = this.getAllLeavesId(this.state.filteredNodes, []);
        const allLeavesChecked = leaves.every((id: number) => this.isNodeChecked(id));
        return allChildrenChecked || allLeavesChecked;
    };

    getAllLeavesId = (nodes: TreeNode[], ids: number[]): number[] => {
        nodes.forEach((node: TreeNode) => {
            if (node.children.length) {
                this.getAllLeavesId(node.children, ids);
            } else {
                ids.push(node.id);
            }
        });
        return ids;
    };

    isSomeChildChecked = (node: TreeNode): boolean => node.children.some((child: TreeNode) => {
        let isChecked = this.isNodeChecked(child.id);
        if (child.children.length) {
            isChecked = isChecked || this.isSomeChildChecked(child);
        }
        return isChecked;
    });

    isCollapsed = (id: number): boolean => this.props.collapsedNodes.includes(id);

    handleFilterChanged = (filter: string): void => {
        this._filter = filter;
        let filteredTree: TreeNode[] = [];
        const matchedIds: number[] = [];
        const rootNodes = this.getRootNodes();
        rootNodes.forEach((node: TreeNode) => this.getMatchingIds(node, filter, matchedIds));
        filteredTree = this.filterTree(this.props.nodes, matchedIds);
        this.setState({ filteredNodes: filteredTree });
        this.handleOrderChange(filteredTree);
    };

    getMatchingIds = (node: TreeNode, filter: string, foundIds: number[]): boolean => {
        let isMatching = node.labels[0].indexOf(filter) > -1;
        if (node.children && node.children.length) {
            node.children.forEach((child: TreeNode) => {
                const hasMatchingChild = this.getMatchingIds(child, filter, foundIds);
                isMatching = isMatching || hasMatchingChild;
            });
        }
        if (isMatching) {
            foundIds.push(node.id);
        }
        return isMatching;
    };

    filterTree = (nodes: TreeNode[], matchedIds: number[]): TreeNode[] =>
        nodes.filter((node: TreeNode) => matchedIds.indexOf(node.id) > -1)
            .map((node: TreeNode) => ({
                ...node,
                children: node.children ? this.filterTree(node.children, matchedIds) : []
            }));

    renderFilterTree = (): JSX.Element => <React.Fragment>
        <Filter onChange={(e: React.ChangeEvent<HTMLInputElement>) => this.handleFilterChanged(e.target.value)} />
        {this.renderTable(this.state.filteredNodes)}
    </React.Fragment>;

    renderTable = (nodes: TreeNode[]): JSX.Element =>
        <Table
            nodes={nodes}
            collapsedNodes={this.props.collapsedNodes}
            isCheckable={this.props.showCheckboxes}
            isClosable={this.props.showCloseIcons}
            sortConfig={this.state.sortConfig}
            getCheckedStatus={this.getCheckedStatus}
            onToggleCollapse={this.handleCollapse}
            onToggleCheck={this.handleCheck}
            onClose={this.handleClose}
            onSort={this.handleOrderChange}
            onSortConfigChange={this.handleSortConfigChange}
            showHeader={this.props.showHeader}
            headers={this.props.headers}
            className={this.props.className} />;

    render(): JSX.Element | undefined {
        if (!this.props.nodes) { return undefined; }
        const rootNodes = this.getRootNodes();
        if (rootNodes && rootNodes.length) {
            return <React.Fragment>
                {this.props.showFilter
                    ? this.renderFilterTree()
                    : this.renderTable(rootNodes)
                }

            </React.Fragment>;
        } else {
            return <Message></Message>;
        }
    }

    componentDidUpdate(prevProps: FilterTreeProps): void {
        if (!isEqual(this.props.nodes, prevProps.nodes)) {
            this.handleFilterChanged(this._filter);
        }
    }
}
