import { Entry } from 'tsp-typescript-client/lib/models/entry';
import { TreeNode } from './tree-node';

const entryToTreeNode = (entry: Entry) => ({
        id: entry.id,
        parentId: entry.parentId,
        name: entry.labels[0],
        isRoot: false,
        children: []
    } as TreeNode);

export const listToTree = (list: Entry[]): TreeNode[] => {
    const rootNodes: TreeNode[] = [];
    const lookup: { [key: string]: TreeNode } = {};
    list.forEach(entry => {
        lookup[entry.id] = entryToTreeNode(entry);
    });
    Object.keys(lookup).forEach(id => {
        const entry = lookup[id];
        if (entry.parentId === -1) {
            entry.isRoot = true;
            rootNodes.push(entry);
        } else if (entry.parentId in lookup) {
            const p = lookup[entry.parentId];
            p.children.push(entry);
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
