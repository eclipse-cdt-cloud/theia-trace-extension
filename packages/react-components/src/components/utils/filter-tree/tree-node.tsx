export interface TreeNode {
    id: number;
    parentId: number;
    labels: string[];
    children: Array<TreeNode>;
    isRoot: boolean;
    showTooltip?: boolean;
    elementIndex?: number;
    getElement?: () => JSX.Element;
}
