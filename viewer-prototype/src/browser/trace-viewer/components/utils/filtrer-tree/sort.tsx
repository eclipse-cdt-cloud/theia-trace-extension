import icons from './icons';
import { TreeNode } from './tree-node';

interface SortState {
    asc: React.ReactNode,
    desc: React.ReactNode,
    default: React.ReactNode;
}

export const sortState: SortState = {
    asc: icons.sortUp,
    desc: icons.sortDown,
    default: icons.sort
};

export interface SortConfig {
    column: string;
    columnIndex: number;
    sortState: React.ReactNode;
}

export const nextSortState = (currentState: React.ReactNode): React.ReactNode => {
    if (currentState === sortState.default || currentState === sortState.asc) {
        return sortState.desc;
    } else if (currentState === sortState.desc) {
        return sortState.asc;
    } else {
        return sortState.default;
    }
};

export const sortNodes = (nodes: TreeNode[], sortConfig: SortConfig[]): TreeNode[] => {
    const sortedNodes = [...nodes];
    const orderToSort = sortConfig.find((config: SortConfig) => config.sortState !== sortState.default);
    if (orderToSort) {
        sortedNodes.sort((node1: TreeNode, node2: TreeNode) => {
            const index = orderToSort.columnIndex;
            const order = (orderToSort.sortState === sortState.asc) ? 'asc' : 'desc';
            const value1 = node1.labels[index];
            const value2 = node2.labels[index];
            let result = 0;
            if (!value1 && value2) {
                result = -1;
            } else if (value1 && !value2) {
                result = 1;
            } else if (!value1 && !value2) {
                result = 0;
            } else {
                if (typeof value1 === 'string' && typeof value2 === 'string') {
                    const comp = (value1 as string).localeCompare(value2);
                    result = (order === 'asc') ? -comp : comp;
                } else {
                    if (value1 < value2) {
                        result = (order === 'asc') ? -1 : 1;
                    } else if (value1 > value2) {
                        result = (order === 'asc') ? 1 : -1;
                    } else {
                        result = 0;
                    }
                }
            }
            return result;
        });
        sortedNodes.forEach((node: TreeNode) => {
            if (node.children.length) {
                node.children = sortNodes(node.children, sortConfig);
            }
        });
    }
    return sortedNodes;
};
