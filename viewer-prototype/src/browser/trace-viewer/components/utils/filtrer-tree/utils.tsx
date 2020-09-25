import { Entry } from 'tsp-typescript-client/lib/models/entry';
import { TreeNode } from './tree-node';

const entryToTreeNode = (entry: Entry) => ({
        name: ((entry.labels) && (entry.labels.length > 0)) ? entry.labels[0] : '',
        isRoot: false,
        children: [],
        ...entry
    } as TreeNode);

export const listToTree = (list: Entry[]): TreeNode[] => {
    const rootNodes: TreeNode[] = [];
    const lookup: { [key: string]: TreeNode } = {};
    // Fill-in the lookup table
    list.forEach(entry => {
        lookup[entry.id] = entryToTreeNode(entry);
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
