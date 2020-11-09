import { Entry } from 'tsp-typescript-client/lib/models/entry';
import { TreeNode } from './tree-node';
import ColumnHeader from './column-header';

const entryToTreeNode = (entry: Entry, headers: ColumnHeader[]) => {
    // TODO Instead of padding the labels, ColumnHeader should use a getter function  instead of just assuming strings, this will allow to get the legend for XY charts
    const labels = ((entry.labels) && (entry.labels.length > 0)) ? entry.labels : [''];
    // Pad the labels to match the header count
    for (let i = labels.length; i <= headers.length - 1; i++) {
        labels[i] = '';
    }
    return ({
        labels: labels,
        isRoot: false,
        id: entry.id,
        parentId: entry.parentId,
        children: []
    } as TreeNode);
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
        if ((entry.parentId !== undefined) && (entry.parentId !== -1)) {
            const parent: TreeNode = lookup[entry.parentId];
            if (parent) {
                parent.children.push(node);
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

export const getAllExpandedNodeIds = (nodes: TreeNode[],collapsedNodes: number[]): number[] => {
    const visibleIds: number[] = [];
    nodes.forEach((node: TreeNode) => {
        visibleIds.push(node.id);
        if (node.children.length && !collapsedNodes.includes(node.id)) {
            visibleIds.push(...getAllExpandedNodeIds(node.children, collapsedNodes));
        }
    });
    return visibleIds;
};
