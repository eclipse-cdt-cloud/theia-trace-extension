import { listToTree } from "../utils";

describe('listToTree', () => {
    const parent = {
        id: 0,
        parentId: -1,
        labels: ['parent', 'parent second column']
    };
    const child1 = {
        id: 1,
        parentId: parent.id,
        labels: ['child1', 'child1 second column']
    };
    const child2 = {
        id: 2,
        parentId: parent.id,
        labels: ['child2', 'child2 second column']
    };
    const grandchild1 = {
        id: 3,
        parentId: child2.id,
        labels: ['grandchild1', 'grandchild1 second column']
    };
    const grandchild2 = {
        id: 4,
        parentId: child2.id,
        labels: ['grandchild2', 'grandchild2 second column']
    };

    test('Basic case, empty headers', () => {
        const expectedTree = ({
            labels: parent.labels,
            isRoot: true,
            id: parent.id,
            parentId: parent.parentId,
            children: [{
                labels: child1.labels,
                isRoot: false,
                id: child1.id,
                parentId: child1.parentId,
                children: []
            }, {
                labels: child2.labels,
                isRoot: false,
                id: child2.id,
                parentId: child2.parentId,
                children: [{
                    labels: grandchild1.labels,
                    isRoot: false,
                    id: grandchild1.id,
                    parentId: grandchild1.parentId,
                    children: []
                }, {
                    labels: grandchild2.labels,
                    isRoot: false,
                    id: grandchild2.id,
                    parentId: grandchild2.parentId,
                    children: []
                }]
            }]
        });
        const tree = listToTree([child1, parent, child2, grandchild1, grandchild2], []);
        expect(tree).toMatchObject([expectedTree]);  
    });

});