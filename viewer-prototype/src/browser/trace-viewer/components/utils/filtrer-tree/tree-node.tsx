export interface TreeNode {
    id: number;
    parentId: number;
    name: string;
    children: Array<TreeNode>;
    isRoot: boolean;
}
