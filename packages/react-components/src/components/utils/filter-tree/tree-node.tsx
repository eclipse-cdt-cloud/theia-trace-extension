export interface TreeNode {
    id: number;
    parentId: number;
    labels: string[];
    tooltips?: string[];
    children: Array<TreeNode>;
    isRoot: boolean;
    showTooltip?: boolean;
    elementIndex?: number;
    getElement?: () => JSX.Element;
    /**
     * TODO - Remove or fix this comment.
     *
     * This lets you add dynamic HTML where the content goes in a Tree Node
     * Instead of just a string.
     * I'm not sure what the use case of getElement()? is based on the logic in TableCell.jsx
     * So I didn't use it.  But we may be able to just use that instead.
     *
     * -WY
     */
    getEnrichedContent?: () => JSX.Element;
}
