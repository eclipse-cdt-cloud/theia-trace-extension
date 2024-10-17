import { Entry } from 'tsp-typescript-client/lib/models/entry';
import { TreeNode } from './tree-node';
import ColumnHeader from './column-header';

const entryToTreeNode = (entry: Entry, headers: ColumnHeader[]) => {
    // TODO Instead of padding the labels, ColumnHeader should use a getter function  instead of just assuming strings, this will allow to get the legend for XY charts
    const labels = entry.labels && entry.labels.length > 0 ? entry.labels : [''];
    // Pad the labels to match the header count
    for (let i = labels.length; i <= headers.length - 1; i++) {
        labels[i] = '';
    }
    return {
        labels: labels,
        isRoot: false,
        id: entry.id,
        parentId: entry.parentId,
        children: []
    } as TreeNode;
};

export const listToTree = (list: Entry[], headers: ColumnHeader[]): TreeNode[] => {
    const rootNodes: TreeNode[] = [];
    const lookup: { [key: string]: TreeNode } = {};
    // Fill-in the lookup table
    list.forEach(entry => {
        lookup[entry.id] = entryToTreeNode(entry, headers);
    });
    // Create the tree in the order it has been received
    list.forEach(entry => {
        const node = lookup[entry.id];
        if (entry.parentId !== undefined && entry.parentId !== -1) {
            const parent: TreeNode = lookup[entry.parentId];
            if (parent) {
                if (parent.id !== node.id) {
                    parent.children.push(node);
                }
            } else {
                // no parent available, treat is as root node
                node.isRoot = true;
                rootNodes.push(node);
            }
        } else {
            node.isRoot = true;
            rootNodes.push(node);
        }
    });
    return rootNodes;
};

export const getAllExpandedNodeIds = (nodes: TreeNode[], collapsedNodes: number[], emptyNodes?: number[]): number[] => {
    const visibleIds: number[] = [];
    nodes.forEach((node: TreeNode) => {
        if (!emptyNodes?.includes(node.id)) {
            visibleIds.push(node.id);
        }
        if (node.children.length && !collapsedNodes.includes(node.id)) {
            visibleIds.push(...getAllExpandedNodeIds(node.children, collapsedNodes, emptyNodes));
        }
    });
    return visibleIds;
};

export const getIndexOfNode = (
    id: number,
    nodes: TreeNode[],
    collapsedNodes: number[],
    emptyNodes: number[]
): number => {
    const ids = getAllExpandedNodeIds(nodes, collapsedNodes, emptyNodes);
    return ids.findIndex(eId => eId === id);
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const validateNumArray = (arr: any | undefined): boolean => {
    if (arr && Array.isArray(arr)) {
        return arr.length > 0 && arr.every(value => typeof value === 'number');
    }
    return false;
};

/**
 * Removes specified nodes from the tree structure.
 * @param nodes The array of root nodes of the tree.
 * @param nodesToRemove An array of node IDs to be removed.
 * @param collapsedNodes The array of collapsed node IDs.
 * @returns A new array of root nodes with specified nodes removed.
 */
export function filterEmptyNodes(nodes: TreeNode[], nodesToRemove: number[], collapsedNodes: number[]): TreeNode[] {
    // return nodes;
    return nodes.reduce((acc: TreeNode[], node) => {
        // Create a new node object with the same properties
        const newNode: TreeNode = { ...node };

        // Recursively remove nodes from children
        if (newNode.children.length > 0) {
            newNode.children = filterEmptyNodes(newNode.children, nodesToRemove, collapsedNodes);
        }

        if (!nodesToRemove.includes(node.id)) {
            // If the new node is not in the removal list, add it to the accumulator
            acc.push(newNode);
        } else if (!collapsedNodes.includes(node.id)) {
            // If the new node is in the removal list and expanded, add its filtered children to the accumulator
            newNode.children.forEach(child => {
                child.parentId = newNode.parentId;
                acc.push(child);
            });
        }

        return acc;
    }, []);
}
