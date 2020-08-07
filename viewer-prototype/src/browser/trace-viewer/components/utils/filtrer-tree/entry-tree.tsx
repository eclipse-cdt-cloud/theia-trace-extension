import * as React from 'react';
import { Entry } from 'tsp-typescript-client/lib/models/entry';
import { listToTree } from './utils';
import { FilterTree } from './tree';

interface EntryTreeProps {
    entries: Entry[];
    checkedSeries: number[];
    showCheckboxes: boolean;
    collapsedNodes: number[];
    showFilter: boolean;
    onToggleCheck: (ids: number[]) => void;
    onToggleCollapse: (id: number) => void;
}

export class EntryTree extends React.Component<EntryTreeProps> {
    static defaultProps: Partial<EntryTreeProps> = {
        showFilter: true
    };

    constructor(props: EntryTreeProps) {
        super(props);
    }

    shouldComponentUpdate = (nextProps: EntryTreeProps): boolean =>
        (this.props.checkedSeries !== nextProps.checkedSeries || this.props.entries !== nextProps.entries || this.props.collapsedNodes !== nextProps.collapsedNodes);

    render(): JSX.Element {
        return <FilterTree
            nodes={listToTree(this.props.entries)}
            {...this.props}
        />;
    }
}
