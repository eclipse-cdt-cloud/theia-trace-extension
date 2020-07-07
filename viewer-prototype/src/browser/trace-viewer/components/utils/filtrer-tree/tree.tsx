import * as React from 'react';
import { TreeNode, TreeNodeComponent, defaultTreeNode } from './tree-node';
import { Message } from './message';
import { Filter } from './filter';

interface FilterTreeProps {
    nodes: TreeNode[];
    showCheckboxes: boolean;
    showFilter: boolean;                    // Optional
    checkedSeries: number[];                // Optional
    collapsedNodes: number[];
    onChecked: (ids: number[]) => void;     // Optional
    onCollapse: (id: number) => void;
}

type FilterTreeState = {
    filteredNodes: TreeNode[];
}

export class FilterTree extends React.Component<FilterTreeProps, FilterTreeState> {
    static defaultProps: Partial<FilterTreeProps> = {
        checkedSeries: [],
        showFilter: true,
        onChecked: () => { /* Nothing to do */ },
    };

    constructor(props: FilterTreeProps) {
        super(props);
        this.state = {
            filteredNodes: this.props.nodes
        }
    }

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
        this.props.onCollapse(id);
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
            if (checkedNode.children.length) {
                const childrenIds = this.getAllChildrenIds(checkedNode, []);
                const visibleChildrenIds = childrenIds.filter((id: number) => {
                    return this.getNode(this.state.filteredNodes, id) !== undefined;
                })
                if (this.isNodeChecked(id)) {
                    checkedIds = checkedIds.concat(visibleChildrenIds);
                } else {
                    const childIdsToCheck = visibleChildrenIds.filter(childId => !this.isNodeChecked(childId));
                    checkedIds = checkedIds.concat(childIdsToCheck);
                }
            } else {
                checkedIds.push(id);
                if (this.areAllSiblingsChecked(checkedNode)) {
                    checkedIds.push(checkedNode.parentId);
                }
            }
            this.props.onChecked(checkedIds);
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

    isEveryChildChecked = (node: TreeNode): boolean => node.children.every((child: TreeNode) => this.isNodeChecked(child.id));

    isSomeChildChecked = (node: TreeNode): boolean => node.children.some((child: TreeNode) => this.isNodeChecked(child.id));

    isCollapsed = (id: number): boolean => this.props.collapsedNodes.includes(id);

    handleFilterChanged = (filter: string) : void => {
        let filteredTree: TreeNode[] = [];
        const matchedIds: number[] = [];
        const rootNodes = this.getRootNodes();
        rootNodes.forEach((node: TreeNode) => this.getMatchingIds(node, filter, matchedIds));
        filteredTree = this.filterTree(this.props.nodes, matchedIds);
        this.setState({filteredNodes: filteredTree});
    }

    getMatchingIds = (node: TreeNode, filter: string, foundIds: number[])=> {
        let isMatching = node.name.indexOf(filter) > -1;
        if (node.children && node.children.length) {
            node.children.forEach((child: TreeNode) => {
                const hasMatchingChild = this.getMatchingIds(child, filter, foundIds);
                isMatching = isMatching || hasMatchingChild;
            })
        }
        if (isMatching) {
            foundIds.push(node.id);
        }
        return isMatching;
    }

    filterTree = (nodes: TreeNode[], matchedIds: number[]): TreeNode[] => {
        return nodes.filter((node: TreeNode) => matchedIds.indexOf(node.id) > -1)
                    .map((node: TreeNode) => ({
                        ...node,
                        children: node.children ? this.filterTree(node.children, matchedIds) : []
                    }));
    }

    renderFilterTree = (): JSX.Element => {
        return <React.Fragment>
            <Filter onChange={(e:React.ChangeEvent<HTMLInputElement>)=> this.handleFilterChanged(e.target.value)}/>
            {this.state.filteredNodes.length
                ? this.renderTreeNodes(this.state.filteredNodes) 
                : <span>No entries found</span>
            }
            
        </React.Fragment>
    }

    renderTreeNodes = (nodes: TreeNode[], parent: TreeNode = defaultTreeNode, level: number = 0): JSX.Element | undefined => {
        const treeNodes = nodes.map((node: TreeNode) => {
            const children = node.children.length > 0 ? this.renderTreeNodes(node.children, node, level+1) : undefined;
            const checkedStatus = this.getCheckedStatus(node.id);

            if (!node.isRoot && this.isCollapsed(node.parentId)) {
                return undefined;
            }
            return (
                <TreeNodeComponent
                    node={node}
                    key={'node-'+node.id}
                    level={level}
                    padding={15}
                    checkedStatus={checkedStatus}
                    collapsed={this.isCollapsed(node.id)}
                    isCheckable={this.props.showCheckboxes}
                    onCollapsed={this.handleCollapse}
                    onChecked={this.handleCheck}
                >
                    {children}
                </TreeNodeComponent>
            );
        });
        return (
            <ul style={{margin: 0, listStyleType: 'none', padding: 0}}>
                {treeNodes}
            </ul>
        );
    };

    render(): JSX.Element | undefined {
        if (!this.props.nodes) {return undefined;}
        const rootNodes = this.getRootNodes();
        if (rootNodes && rootNodes.length) {
            return <React.Fragment>
                { this.props.showFilter 
                    ? this.renderFilterTree()
                    : this.renderTreeNodes(rootNodes)
                }               

            </React.Fragment>
            
        } else {
            return <Message></Message>;
        }
    }
}
