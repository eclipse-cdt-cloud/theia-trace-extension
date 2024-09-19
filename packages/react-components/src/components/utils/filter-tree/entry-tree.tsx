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
    showCloseIcons: boolean;
    selectedRow?: number;
    multiSelectedRows?: number[];
    collapsedNodes: number[];
    emptyNodes: number[];
    hideEmptyNodes: boolean;
    showFilter: boolean;
    onToggleCheck: (ids: number[]) => void;
    onRowClick: (id: number) => void;
    onMultipleRowClick?: (id: number, isShiftClicked?: boolean) => void;
    onContextMenu: (event: React.MouseEvent<HTMLDivElement>, id: number) => void;
    onClose: (id: number) => void;
    onToggleCollapse: (id: number, nodes: TreeNode[]) => void;
    onOrderChange: (ids: number[]) => void;
    showHeader: boolean;
    headers: ColumnHeader[];
    className: string;
}

export class EntryTree extends React.Component<EntryTreeProps> {
    static defaultProps: Partial<EntryTreeProps> = {
        showFilter: true,
        onOrderChange: () => {
            /* Nothing to do */
        },
        showHeader: true,
        className: 'table-tree',
        headers: [{ title: 'Name', sortable: true }]
    };

    constructor(props: EntryTreeProps) {
        super(props);
    }

    shouldComponentUpdate = (nextProps: EntryTreeProps): boolean =>
        this.props.checkedSeries !== nextProps.checkedSeries ||
        this.props.entries !== nextProps.entries ||
        this.props.collapsedNodes !== nextProps.collapsedNodes ||
        this.props.selectedRow !== nextProps.selectedRow ||
        this.props.multiSelectedRows !== nextProps.multiSelectedRows ||
        this.props.hideEmptyNodes !== nextProps.hideEmptyNodes ||
        this.props.emptyNodes !== nextProps.emptyNodes;

    render(): JSX.Element {
        return <FilterTree nodes={listToTree(this.props.entries, this.props.headers)} {...this.props} />;
    }
}
