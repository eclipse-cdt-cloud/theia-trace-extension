import { Entry } from 'tsp-typescript-client/lib/models/entry';
import { TreeNode } from './tree-node';

const entryToTreeNode = (entry: Entry) => ({
        id: entry.id,
        parentId: entry.parentId,
        name: entry.labels[0],
        expanded: true,
        isRoot: false,
        children: []
    } as TreeNode);

export const listToTree = (list: Entry[], rootId: number): TreeNode[] => {
    const rootNodes: TreeNode[] = [];
    const lookup: { [key: string]: TreeNode } = {};
    list.forEach(entry => {
        lookup[entry.id] = entryToTreeNode(entry);
    });
    Object.keys(lookup).forEach(id => {
        const entry = lookup[id];
        if (entry.parentId === rootId) {
            entry.isRoot = true;
            rootNodes.push(entry);
        } else if (entry.parentId in lookup) {
            const p = lookup[entry.parentId];
            p.children.push(entry);
        }
    });
    return rootNodes;
};

export const getAllVisibleEntriesId = (entries: Entry[],collapsedNodes: number[]): number[] => {
    const nodes = listToTree(entries, -1);
    const visibleIds: number[] = [];
    let currentNode: TreeNode | undefined;
    while (nodes.length) {
        currentNode = nodes.pop();
        if (currentNode) {
            visibleIds.push(currentNode.id);
            if (currentNode.children && currentNode.children.length && !collapsedNodes.includes(currentNode.id)) {
                currentNode.children.forEach((child: TreeNode) => {
                    nodes.push(child);
                });
            }
        }
    }
    return visibleIds;
};

export const getOrderedIds = (nodes: TreeNode[]): number[] => {
    const orderedIds: number[] = [];
    nodes.forEach((node: TreeNode) => {
        orderedIds.push(node.id);
        if (node.children.length) {
            orderedIds.push(...getOrderedIds(node.children));
        }
    });
    return orderedIds;
};
