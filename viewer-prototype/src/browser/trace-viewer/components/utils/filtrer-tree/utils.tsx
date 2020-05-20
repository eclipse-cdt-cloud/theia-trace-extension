import { Entry } from 'tsp-typescript-client/lib/models/entry';
import { TreeNode } from './tree-node';

const entryToTreeNode = (entry: Entry) => {
    return ({
        id: entry.id,
        parentId: entry.parentId,
        name: entry.labels[0],
        expanded: true,
        isRoot: false,
        children: []
    } as TreeNode)    
}

export const listToTree = (list: Entry[]) => {
    let rootNodes: TreeNode[] = [];
    let lookup : any = {};
    list.forEach(entry => {
        lookup[entry.id] = entryToTreeNode(entry);
    });
    Object.keys(lookup).forEach(id => {
        let entry = lookup[id];
        if (entry.parentId === -1) {
            entry.isRoot = true; 
            rootNodes.push(entry);
        } else if (entry.parentId in lookup) {
            let p = lookup[entry.parentId];
            p.children.push(entry);
        }
    });
    return rootNodes;
}