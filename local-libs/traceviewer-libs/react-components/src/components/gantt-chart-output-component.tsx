import * as React from 'react';
import { TimelineChart } from 'timeline-chart/lib/time-graph-model';
import '../../style/react-contextify.css';
import {
    AbstractGanttOutputComponent,
    AbstractGanttOutputProps,
    AbstractGanttOutputState
} from './abstract-gantt-output-component';
import { EntryTree } from './utils/filter-tree/entry-tree';
import { validateNumArray } from './utils/filter-tree/utils';
import { ResponseStatus } from 'tsp-typescript-client';

type GanttChartOutputProps = AbstractGanttOutputProps & {
    initialViewRange?: TimelineChart.TimeGraphRange;
    children?: React.ReactNode;
    onResetZoom?: () => void;
};
type GanttChartOutputState = AbstractGanttOutputState & {
    zoomResetCounter?: number;
};

export class GanttChartOutputComponent extends AbstractGanttOutputComponent<
    GanttChartOutputProps,
    GanttChartOutputState
> {
    private initialViewRangeSnapshot?: TimelineChart.TimeGraphRange;

    constructor(props: GanttChartOutputProps) {
        super(props);

        this.state = {
            outputStatus: ResponseStatus.RUNNING,
            chartTree: [],
            defaultOrderedIds: [],
            markerCategoryEntries: [],
            markerLayerData: undefined,
            collapsedNodes: validateNumArray(this.props.persistChartState?.collapsedNodes)
                ? (this.props.persistChartState.collapsedNodes as number[])
                : [],
            selectedRow: undefined,
            multiSelectedRows: [],
            selectedMarkerRow: undefined,
            columns: [],
            collapsedMarkerNodes: validateNumArray(this.props.persistChartState?.collapsedMarkerNodes)
                ? (this.props.persistChartState.collapsedMarkerNodes as number[])
                : [],
            showTree: true,
            searchString: '',
            filters: [],
            emptyNodes: [],
            marginTop: 0
        };

        // Store a snapshot of the initial view range
        if (props.initialViewRange) {
            this.initialViewRangeSnapshot = { start: props.initialViewRange.start, end: props.initialViewRange.end };
        }
    }

    renderTree(): React.ReactNode {
        this.onOrderChange = this.onOrderChange.bind(this);
        this.onOrderReset = this.onOrderReset.bind(this);
        // TODO Show header, when we can have entries in-line with timeline-chart
        return (
            <>
                <div
                    ref={this.chartTreeRef}
                    className="scrollable"
                    onScroll={() => this.synchronizeTreeScroll()}
                    style={{
                        height:
                            parseInt(this.props.style.height.toString()) -
                            this.getMarkersLayerHeight() -
                            (document.getElementById(this.props.traceId + this.props.outputDescriptor.id + 'searchBar')
                                ?.offsetHeight ?? 0)
                    }}
                    tabIndex={0}
                >
                    {this.renderContextMenu()}
                    <EntryTree
                        collapsedNodes={this.state.collapsedNodes}
                        showFilter={false}
                        entries={this.state.chartTree}
                        showCheckboxes={false}
                        onToggleCollapse={this.onToggleCollapse}
                        onRowClick={this.onRowClick}
                        onMultipleRowClick={this.onMultipleRowClick}
                        selectedRow={this.state.selectedRow}
                        multiSelectedRows={this.state.multiSelectedRows}
                        showHeader={true}
                        onContextMenu={this.onCtxMenu}
                        className="table-tree gantt-tree"
                        emptyNodes={this.state.emptyNodes}
                        hideEmptyNodes={this.shouldHideEmptyNodes}
                        onOrderChange={this.onOrderChange}
                        onOrderReset={this.onOrderReset}
                        headers={this.state.columns}
                        hideFillers={true}
                    />
                </div>
                <div ref={this.markerTreeRef} className="scrollable" style={{ height: this.getMarkersLayerHeight() }}>
                    <EntryTree
                        collapsedNodes={this.state.collapsedMarkerNodes}
                        showFilter={false}
                        entries={this.state.markerCategoryEntries}
                        showCheckboxes={false}
                        showCloseIcons={true}
                        onRowClick={this.onMarkerRowClick}
                        selectedRow={this.state.selectedMarkerRow}
                        onToggleCollapse={this.onToggleAnnotationCollapse}
                        onClose={this.onMarkerCategoryRowClose}
                        showHeader={false}
                        className="table-tree ganttchart-tree"
                        hideFillers={true}
                    />
                </div>
            </>
        );
    }
}
