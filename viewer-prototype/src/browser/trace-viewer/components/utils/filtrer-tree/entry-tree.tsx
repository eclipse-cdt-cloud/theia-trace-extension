import * as React from 'react';
import { Entry } from 'tsp-typescript-client/lib/models/entry';
import { listToTree } from './utils';
import { FilterTree } from './tree';

interface EntryTreeProps {
    entries: Entry[];
    showCheckboxes: boolean;
    padding: number;
    checkedSeries: number[];
    collapsedNodes: number[];
    collapseEnabled: boolean;
    onChecked: (ids: number[]) => void;
    onCollapse: (id: number) => void;
}

export class EntryTree extends React.Component<EntryTreeProps> {
    static defaultProps: Partial<EntryTreeProps> = {
        padding: 15,
        checkedSeries: [],
        collapseEnabled: true,
        onChecked: () => { /* Nothing to do */ },
    };

    constructor(props: EntryTreeProps) {
        super(props);
    }

    shouldComponentUpdate = (nextProps: EntryTreeProps): boolean => (this.props.checkedSeries !== nextProps.checkedSeries
        || this.props.entries !== nextProps.entries
        || this.props.collapsedNodes !== nextProps.collapsedNodes);

    render(): JSX.Element {
        return <FilterTree
            nodes={listToTree(this.props.entries)}
            {...this.props}
        />;
    }
}
