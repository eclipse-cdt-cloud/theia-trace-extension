import * as React from 'react';
import { Entry } from 'tsp-typescript-client/lib/models/entry';
import { listToTree } from './utils';
import { FilterTree } from './tree';
import { TreeNode } from './tree-node';
import ColumnHeader from './column-header';

interface EntryTreeProps {
    entries: Entry[];
    checkedSeries: number[];
    showCheckboxes: boolean;
    collapsedNodes: number[];
    showFilter: boolean;
    onToggleCheck: (ids: number[]) => void;
    onToggleCollapse: (id: number, nodes: TreeNode[]) => void;
    onOrderChange: (ids: number[]) => void;
    showHeader: boolean;
    headers: ColumnHeader[];
    className: string;
}

export class EntryTree extends React.Component<EntryTreeProps> {
    static defaultProps: Partial<EntryTreeProps> = {
        showFilter: true,
        onOrderChange: () => { /* Nothing to do */ },
        showHeader: true,
        className: 'table-tree',
        headers: [{title: 'Name', sortable: true}]
    };

    constructor(props: EntryTreeProps) {
        super(props);
    }

    shouldComponentUpdate = (nextProps: EntryTreeProps): boolean =>
        (this.props.checkedSeries !== nextProps.checkedSeries || this.props.entries !== nextProps.entries || this.props.collapsedNodes !== nextProps.collapsedNodes);

    render(): JSX.Element {
        return <FilterTree
            nodes={listToTree(this.props.entries, this.props.headers)}
            {...this.props}
        />;
    }
}
