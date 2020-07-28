import * as React from 'react';
import { Entry } from 'tsp-typescript-client/lib/models/entry';
import { listToTree } from './utils';
import { FilterTree } from './tree';

interface XYTreeProps {
    entries: Entry[];
    checkedSeries: number[];
    collapsedNodes: number[];
    showFilter: boolean;
    onChecked: (ids: number[]) => void;
    onCollapse: (id: number) => void;
}

export class XYTree extends React.Component<XYTreeProps> {
    static defaultProps: Partial<XYTreeProps> = {
        showFilter: true
    };

    constructor(props: XYTreeProps) {
        super(props);
    }

    shouldComponentUpdate = (nextProps: XYTreeProps): boolean => (this.props.checkedSeries !== nextProps.checkedSeries || this.props.entries !== nextProps.entries);

    render(): JSX.Element {
        return <FilterTree
            nodes = { listToTree(this.props.entries) }
            showCheckboxes={true}
            showFilter={this.props.showFilter}
            collapsedNodes={this.props.collapsedNodes}
            checkedSeries={this.props.checkedSeries}
            onChecked={this.props.onChecked}
            onCollapse={this.props.onCollapse}
        />;
    }
}
