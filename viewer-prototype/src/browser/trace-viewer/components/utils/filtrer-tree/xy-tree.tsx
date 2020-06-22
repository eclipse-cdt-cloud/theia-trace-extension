import * as React from 'react';
import { Entry } from 'tsp-typescript-client/lib/models/entry';
import { listToTree } from './utils';
import { FilterTree } from './tree';

interface XYTreeProps {
    entries: Entry[];
    checkedSeries: number[];
    collapsedNodes: number[];
    onChecked: (ids: number[]) => void;
    onCollapse: (id: number) => void;
}

export class XYTree extends React.Component<XYTreeProps> {
    constructor(props: XYTreeProps) {
        super(props);
    }

    shouldComponentUpdate = (nextProps: XYTreeProps) => (this.props.checkedSeries !== nextProps.checkedSeries || this.props.entries !== nextProps.entries);

    render() {
        return <FilterTree
            nodes = { listToTree(this.props.entries) }
            showCheckboxes={true}
            collapsedNodes={this.props.collapsedNodes}
            checkedSeries={this.props.checkedSeries}
            onChecked={this.props.onChecked}
            onCollapse={this.props.onCollapse}
        />;
    }
}
