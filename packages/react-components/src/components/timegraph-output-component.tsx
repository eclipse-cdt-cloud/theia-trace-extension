import * as React from 'react';
import { TimeGraphComponent } from 'timeline-chart/lib/components/time-graph-component';
import { TimeGraphStateComponent, TimeGraphStateStyle } from 'timeline-chart/lib/components/time-graph-state';
import { TimeGraphChart, TimeGraphChartProviders } from 'timeline-chart/lib/layer/time-graph-chart';
import { TimeGraphChartArrows } from 'timeline-chart/lib/layer/time-graph-chart-arrows';
import { TimeGraphRangeEventsLayer } from 'timeline-chart/lib/layer/time-graph-range-events-layer';
import { TimeGraphChartCursors } from 'timeline-chart/lib/layer/time-graph-chart-cursors';
import { TimeGraphMarkersChartCursors } from 'timeline-chart/lib/layer/time-graph-markers-chart-cursors';
import { TimeGraphChartGrid } from 'timeline-chart/lib/layer/time-graph-chart-grid';
import { TimeGraphChartSelectionRange } from 'timeline-chart/lib/layer/time-graph-chart-selection-range';
import { TimeGraphVerticalScrollbar } from 'timeline-chart/lib/layer/time-graph-vertical-scrollbar';
import { TimelineChart } from 'timeline-chart/lib/time-graph-model';
import { TimeGraphRowController } from 'timeline-chart/lib/time-graph-row-controller';
import { QueryHelper } from 'tsp-typescript-client/lib/models/query/query-helper';
import { ResponseStatus } from 'tsp-typescript-client/lib/models/response/responses';
import { TimeGraphEntry } from 'tsp-typescript-client/lib/models/timegraph';
import { signalManager } from 'traceviewer-base/lib/signals/signal-manager';
import { AbstractOutputProps } from './abstract-output-component';
import { AbstractTreeOutputComponent, AbstractTreeOutputState } from './abstract-tree-output-component';
import { StyleProperties } from './data-providers/style-properties';
import { StyleProvider } from './data-providers/style-provider';
import { TspDataProvider } from './data-providers/tsp-data-provider';
import { ReactTimeGraphContainer } from './utils/timegraph-container-component';
import { OutputElementStyle } from 'tsp-typescript-client/lib/models/styles';
import { EntryTree } from './utils/filter-tree/entry-tree';
import { listToTree, getAllExpandedNodeIds, getIndexOfNode, validateNumArray } from './utils/filter-tree/utils';
import hash from 'traceviewer-base/lib/utils/value-hash';
import ColumnHeader from './utils/filter-tree/column-header';
import { TimeGraphAnnotationComponent } from 'timeline-chart/lib/components/time-graph-annotation';
import { Entry, OutputDescriptor } from 'tsp-typescript-client';
import { isEqual } from 'lodash';
import { convertColorStringToHexNumber } from 'traceviewer-base/lib/utils/convert-color-string-to-hex';
import { faSpinner } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import Chip from '@mui/material/Chip';
import { debounce } from 'lodash';
import '../../style/react-contextify.css';
import { Item, ItemParams, Menu, Separator, Submenu, useContextMenu } from 'react-contexify';
import {
    ContextMenuContributedSignalPayload,
    ContextMenuItems,
    MenuItem,
    SubMenu
} from 'traceviewer-base/lib/signals/context-menu-contributed-signal-payload';
import { ContextMenuItemClickedSignalPayload } from 'traceviewer-base/lib/signals/context-menu-item-clicked-signal-payload';
import { RowSelectionsChangedSignalPayload } from 'traceviewer-base/lib/signals/row-selections-changed-signal-payload';
import { ItemPropertiesSignalPayload } from 'traceviewer-base/lib/signals/item-properties-signal-payload';

type TimegraphOutputProps = AbstractOutputProps & {
    addWidgetResizeHandler: (handler: () => void) => void;
    removeWidgetResizeHandler: (handler: () => void) => void;
};

type TimegraphOutputState = AbstractTreeOutputState & {
    timegraphTree: TimeGraphEntry[];
    markerCategoryEntries: Entry[];
    markerLayerData:
        | { rows: TimelineChart.TimeGraphRowModel[]; range: TimelineChart.TimeGraphRange; resolution: number }
        | undefined;
    selectedRow?: number;
    multiSelectedRows?: number[];
    selectedMarkerRow?: number;
    collapsedNodes: number[];
    collapsedMarkerNodes: number[];
    columns: ColumnHeader[];
    searchString: string;
    filters: string[];
    menuItems?: ContextMenuItems;
    emptyNodes: number[];
};

const COARSE_RESOLUTION_FACTOR = 8; // resolution factor to use for first (coarse) update
const MENU_ID = 'timegraph.menuId-';
export class TimegraphOutputComponent extends AbstractTreeOutputComponent<TimegraphOutputProps, TimegraphOutputState> {
    private totalHeight = 0;
    private rowController: TimeGraphRowController;
    private markerRowController: TimeGraphRowController;
    private chartLayer: TimeGraphChart;
    private markersChartLayer: TimeGraphChart;
    private vscrollLayer: TimeGraphVerticalScrollbar;
    private chartCursors: TimeGraphChartCursors;
    private markerChartCursors: TimeGraphChartCursors;
    private arrowLayer: TimeGraphChartArrows;
    private rangeEventsLayer: TimeGraphRangeEventsLayer;

    private horizontalContainer: React.RefObject<HTMLDivElement>;
    private timeGraphTreeRef: React.RefObject<HTMLDivElement>;
    private markerTreeRef: React.RefObject<HTMLDivElement>;
    private containerRef: React.RefObject<ReactTimeGraphContainer>;

    private tspDataProvider: TspDataProvider;
    private styleProvider: StyleProvider;
    private styleMap = new Map<string, TimeGraphStateStyle>();

    private selectedElement: TimeGraphStateComponent | undefined;
    private selectedMarkerCategories: string[] | undefined = undefined;
    private onSelectionChanged = (payload: { [key: string]: string }) => this.doHandleSelectionChangedSignal(payload);
    private onOutputDataChanged = (outputs: OutputDescriptor[]) => this.doHandleOutputDataChangedSignal(outputs);
    private onContextMenuContributed = (payload: ContextMenuContributedSignalPayload) =>
        this.doHandleContextMenuContributed(payload);
    private pendingSelection: TimeGraphEntry | undefined;

    private _debouncedUpdateChart = debounce(() => {
        this.chartLayer.updateChart(this.filterExpressionsMap());
    }, 500);

    constructor(props: TimegraphOutputProps) {
        super(props);
        this.state = {
            outputStatus: ResponseStatus.RUNNING,
            timegraphTree: [],
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
            emptyNodes: []
        };
        this.selectedMarkerCategories = this.props.markerCategories;
        this.onToggleCollapse = this.onToggleCollapse.bind(this);
        this.onMarkerCategoryRowClose = this.onMarkerCategoryRowClose.bind(this);
        this.onToggleAnnotationCollapse = this.onToggleAnnotationCollapse.bind(this);
        this.tspDataProvider = new TspDataProvider(
            this.props.tspClient,
            this.props.traceId,
            this.props.outputDescriptor.id
        );
        this.styleProvider = new StyleProvider(
            this.props.outputDescriptor.id,
            this.props.traceId,
            this.props.tspClient
        );
        this.rowController = new TimeGraphRowController(this.props.style.rowHeight, this.totalHeight);
        this.markerRowController = new TimeGraphRowController(this.props.style.rowHeight, this.totalHeight);
        this.horizontalContainer = React.createRef();
        this.timeGraphTreeRef = React.createRef();
        this.markerTreeRef = React.createRef();
        this.containerRef = React.createRef();
        this.handleSearchChange = this.handleSearchChange.bind(this);
        this.clearSearchBox = this.clearSearchBox.bind(this);
        this.onMultipleRowClick = this.onMultipleRowClick.bind(this);
        this.onCtxMenu = this.onCtxMenu.bind(this);

        const providers: TimeGraphChartProviders = {
            rowProvider: () => this.getTimegraphRowIds(),
            /**
             * @param range requested time range
             * @param resolution requested time interval between samples
             * @returns row models with the actual range and resolution
             */
            dataProvider: async (
                range: TimelineChart.TimeGraphRange,
                resolution: number,
                fetchArrows: boolean,
                rowIds?: number[],
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                additionalProperties?: { [key: string]: any }
            ) => this.fetchTimegraphData(range, resolution, fetchArrows, rowIds, additionalProperties),
            stateStyleProvider: (state: TimelineChart.TimeGraphState) => this.getStateStyle(state),
            rowAnnotationStyleProvider: (annotation: TimelineChart.TimeGraphAnnotation) =>
                this.getAnnotationStyle(annotation),
            rowStyleProvider: (row?: TimelineChart.TimeGraphRowModel) => this.getRowStyle(row)
        };

        const markersProvider: TimeGraphChartProviders = {
            rowProvider: () => this.getMarkersRowIds(),
            dataProvider: async (range: TimelineChart.TimeGraphRange, resolution: number) =>
                this.fetchMarkersData(range, resolution),
            stateStyleProvider: (state: TimelineChart.TimeGraphState) => this.getMarkerStateStyle(state),
            rowStyleProvider: (row?: TimelineChart.TimeGraphRowModel) => this.getRowStyle(row)
        };

        this.rangeEventsLayer = new TimeGraphRangeEventsLayer('timeGraphRangeEvents', providers);
        this.chartLayer = new TimeGraphChart('timeGraphChart', providers, this.rowController, COARSE_RESOLUTION_FACTOR);
        this.arrowLayer = new TimeGraphChartArrows('timeGraphChartArrows', this.rowController);
        this.vscrollLayer = new TimeGraphVerticalScrollbar('timeGraphVerticalScrollbar', this.rowController);
        this.chartCursors = new TimeGraphChartCursors('chart-cursors', this.chartLayer, this.rowController, {
            color: this.props.style.cursorColor
        });
        this.rowController.onSelectedRowChangedHandler(this.onSelectionChange);
        this.markerRowController.onSelectedRowChangedHandler(this.onMarkerSelectionChange);
        this.rowController.onVerticalOffsetChangedHandler(() => {
            if (this.timeGraphTreeRef.current) {
                this.timeGraphTreeRef.current.scrollTop = this.rowController.verticalOffset;
            }
        });

        this.markersChartLayer = new TimeGraphChart('markersChart', markersProvider, this.markerRowController);
        this.markerChartCursors = new TimeGraphMarkersChartCursors(
            'chart-cursors-new',
            this.markersChartLayer,
            this.markerRowController,
            { color: this.props.style.cursorColor }
        );
        this.chartLayer.onSelectedStateChanged(model => {
            this.pendingSelection = undefined;
            if (model) {
                this.selectedElement = this.chartLayer.getStateById(model.id);
            } else {
                this.selectedElement = undefined;
            }
            this.onElementSelected(this.selectedElement);
        });
        this.chartLayer.registerMouseInteractions({
            mouseover: el => {
                this.props.tooltipComponent?.setElement(el, () => this.fetchTooltip(el));
            },
            mouseout: () => {
                this.props.tooltipComponent?.setElement(undefined);
            },
            click: (el, ev, clickCount) => {
                if (clickCount === 2) {
                    const start = el.model.range.start;
                    const end = el.model.range.end;
                    if (start !== end) {
                        this.props.unitController.viewRange = {
                            start,
                            end
                        };
                    }
                }
            }
        });
        this.markersChartLayer.registerMouseInteractions({
            click: el => {
                if (el instanceof TimeGraphStateComponent) {
                    if (el.model.range.start !== undefined && el.model.range.end !== undefined) {
                        this.props.unitController.selectionRange = {
                            start: el.model.range.start,
                            end: el.model.range.end
                        };
                    }
                }
            }
        });
        this.addPinViewOptions(() => ({
            collapsedNodes: this.state.collapsedNodes,
            collapsedMarkerNodes: this.state.collapsedMarkerNodes
        }));
    }

    synchronizeTreeScroll(): void {
        if (this.timeGraphTreeRef.current) {
            this.rowController.verticalOffset = this.timeGraphTreeRef.current.scrollTop;
        }
    }

    async componentDidMount(): Promise<void> {
        this.setState({
            styleModel: await this.styleProvider.getStyleModel()
        });
        this.waitAnalysisCompletion();
        this.subscribeToEvents();
    }

    componentWillUnmount(): void {
        super.componentWillUnmount();
        this.unsubscribeToEvents();
        this.containerRef.current?.destroyContainer();
    }

    protected subscribeToEvents(): void {
        signalManager().on('CONTRIBUTE_CONTEXT_MENU', this.onContextMenuContributed);
        signalManager().on('OUTPUT_DATA_CHANGED', this.onOutputDataChanged);
        signalManager().on('THEME_CHANGED', this.onThemeChange);
        signalManager().on('SELECTION_CHANGED', this.onSelectionChanged);
    }

    protected unsubscribeToEvents(): void {
        signalManager().off('CONTRIBUTE_CONTEXT_MENU', this.onContextMenuContributed);
        signalManager().off('OUTPUT_DATA_CHANGED', this.onOutputDataChanged);
        signalManager().off('THEME_CHANGED', this.onThemeChange);
        signalManager().off('SELECTION_CHANGED', this.onSelectionChanged);
    }

    async fetchTree(): Promise<ResponseStatus> {
        const parameters = QueryHelper.timeRangeQuery(this.props.range.getStart(), this.props.range.getEnd());
        const tspClientResponse = await this.props.tspClient.fetchTimeGraphTree(
            this.props.traceId,
            this.props.outputDescriptor.id,
            parameters
        );
        const treeResponse = tspClientResponse.getModel();
        if (tspClientResponse.isOk() && treeResponse) {
            if (treeResponse.model) {
                const headers = treeResponse.model.headers;
                const columns = [];
                if (headers && headers.length > 0) {
                    headers.forEach(header => {
                        columns.push({ title: header.name, sortable: true, resizable: true, tooltip: header.tooltip });
                    });
                } else {
                    columns.push({ title: 'Name', sortable: true });
                }
                this.setState(
                    {
                        outputStatus: treeResponse.status,
                        timegraphTree: treeResponse.model.entries,
                        columns
                    },
                    this.updateTotalHeight
                );
            } else {
                this.setState({
                    outputStatus: treeResponse.status
                });
            }
            return treeResponse.status;
        }
        this.setState({
            outputStatus: ResponseStatus.FAILED
        });
        return ResponseStatus.FAILED;
    }

    async componentDidUpdate(prevProps: TimegraphOutputProps, prevState: TimegraphOutputState): Promise<void> {
        if (
            !isEqual(prevProps.markerCategories, this.props.markerCategories) ||
            prevProps.markerSetId !== this.props.markerSetId
        ) {
            this.selectedMarkerCategories = this.props.markerCategories;
            this.chartLayer.updateChart(this.filterExpressionsMap());
            this.markersChartLayer.updateChart();
            this.rangeEventsLayer.update();
            this.arrowLayer.update();
        } else {
            if (
                this.state.outputStatus !== prevState.outputStatus ||
                !isEqual(this.state.timegraphTree, prevState.timegraphTree) ||
                !isEqual(this.state.collapsedNodes, prevState.collapsedNodes)
            ) {
                this.chartLayer.update();
                this.arrowLayer.update();
            }
            if (
                !isEqual(this.state.markerCategoryEntries, prevState.markerCategoryEntries) ||
                !isEqual(this.state.collapsedMarkerNodes, prevState.collapsedMarkerNodes) ||
                !isEqual(this.state.markerLayerData, prevState.markerLayerData)
            ) {
                this.markersChartLayer.updateChart();
            }
        }
        if (
            !isEqual(this.state.searchString, prevState.searchString) ||
            !isEqual(this.state.filters, prevState.filters)
        ) {
            this._debouncedUpdateChart();
        }
        if (!isEqual(this.state.multiSelectedRows, prevState.multiSelectedRows)) {
            const signalPayload: RowSelectionsChangedSignalPayload = new RowSelectionsChangedSignalPayload(
                this.props.traceId,
                this.props.outputDescriptor.id,
                this.getEntryModelsForRowIds(this.state.multiSelectedRows)
            );
            signalManager().emit('ROW_SELECTIONS_CHANGED', signalPayload);
        }
    }

    private onToggleCollapse(id: number) {
        let newList = [...this.state.collapsedNodes];
        const exist = this.state.collapsedNodes.find(expandId => expandId === id);
        if (exist !== undefined) {
            newList = newList.filter(collapsed => id !== collapsed);
        } else {
            newList = newList.concat(id);
        }
        this.setState({ collapsedNodes: newList }, this.updateTotalHeight);
    }

    private onToggleAnnotationCollapse() {
        if (this.state.collapsedMarkerNodes.length === 0) {
            const annotationNodes = this.state.markerCategoryEntries.map(annotation => annotation.id);
            this.setState({ collapsedMarkerNodes: annotationNodes });
        } else {
            this.setState({ collapsedMarkerNodes: [] });
        }
    }

    private onMarkerCategoryRowClose(id: number) {
        const annotation = this.state.markerCategoryEntries.find(entry => entry.id === id);
        if (annotation && this.selectedMarkerCategories) {
            const annotationLabel = annotation.labels[0];
            this.setState({
                markerCategoryEntries: this.state.markerCategoryEntries.filter(item => item !== annotation)
            });
            this.selectedMarkerCategories = this.selectedMarkerCategories.filter(item => item !== annotationLabel);
            const markerLayerData = this.state.markerLayerData;
            if (markerLayerData) {
                markerLayerData.rows = markerLayerData.rows.filter(row => row.id !== id);
                this.setState({
                    markerLayerData
                });
            }
            signalManager().emit('MARKER_CATEGORY_CLOSED', this.props.traceId, annotationLabel);
        }
    }

    private updateTotalHeight() {
        const visibleEntries = [...this.state.timegraphTree].filter(entry => this.isVisible(entry));
        this.totalHeight = visibleEntries.length * this.props.style.rowHeight;
        this.rowController.totalHeight = this.totalHeight;
    }

    private isVisible(entry: TimeGraphEntry): boolean {
        const { collapsedNodes, emptyNodes } = this.state;

        // Check for empty nodes
        if (this.shouldHideEmptyNodes && emptyNodes.includes(entry.id)) {
            return false;
        }

        // Check for collapsed nodes
        let parentId = entry.parentId;
        while (parentId !== undefined && parentId !== -1) {
            if (collapsedNodes.includes(parentId)) {
                return false;
            }
            const parent = this.state.timegraphTree.find(e => e.id === parentId);
            parentId = parent ? parent.parentId : undefined;
        }
        return true;
    }

    private doHandleSelectionChangedSignal(payload: { [key: string]: string }) {
        const startTimestamp = payload['startTimestamp'];
        const endTimestamp = payload['endTimestamp'];
        if (startTimestamp !== undefined && endTimestamp !== undefined) {
            const foundElement = this.findElement(payload);
            // Scroll vertically
            if (foundElement) {
                // Expand parent
                if (this.expandParents(foundElement)) {
                    this.selectAndReveal(foundElement);
                } else {
                    this.pendingSelection = foundElement;
                }
            }
            this.chartCursors.maybeCenterCursor();
        }
    }

    /**
     * For each line in the tree (this.state.timegraphTree), parse the metadata and try to find
     * matches with the key / values pairs of the selected event.
     * It counts the amount of metadata matches and returns the TimeGraphEntry with the greatest amount,
     * which is the most likely result.
     *
     * @params payload
     *      Object with information about the selected event.
     * @return
     *      Correspondent TimeGraphEntry from this.state.timegraphTree
     */
    private findElement(payload: { [key: string]: string | { [key: string]: string } }): TimeGraphEntry | undefined {
        let element: TimeGraphEntry | undefined = undefined;
        let max = 0;
        if (payload && payload.load) {
            this.state.timegraphTree.forEach(el => {
                if (el.metadata) {
                    let cnt = 0;
                    Object.entries(el.metadata).forEach(([key, values]) => {
                        if (typeof payload.load !== 'string') {
                            const val = payload.load[key];
                            if (val !== undefined) {
                                const num = Number(val);
                                // at least one value in array needs to match
                                const result = values.find(
                                    (value: string | number) => (num !== undefined && num === value) || val === value
                                );
                                if (result !== undefined) {
                                    cnt++;
                                }
                            }
                        }
                    });
                    if (cnt > max) {
                        max = cnt;
                        element = el;
                    }
                }
            });
        }
        return element;
    }

    private getMarkersLayerHeight() {
        const rowHeight = 20;
        const scrollbarHeight = 10;
        return this.state.markerCategoryEntries.length <= 1
            ? 0
            : this.state.collapsedMarkerNodes.length
            ? rowHeight
            : this.state.markerCategoryEntries.length * rowHeight + scrollbarHeight;
    }

    renderTree(): React.ReactNode {
        // TODO Show header, when we can have entries in-line with timeline-chart
        return (
            <>
                <div
                    ref={this.timeGraphTreeRef}
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
                        entries={this.state.timegraphTree}
                        showCheckboxes={false}
                        onToggleCollapse={this.onToggleCollapse}
                        onRowClick={this.onRowClick}
                        onMultipleRowClick={this.onMultipleRowClick}
                        selectedRow={this.state.selectedRow}
                        multiSelectedRows={this.state.multiSelectedRows}
                        showHeader={false}
                        onContextMenu={this.onCtxMenu}
                        className="table-tree timegraph-tree"
                        emptyNodes={this.state.emptyNodes}
                        hideEmptyNodes={this.shouldHideEmptyNodes}
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
                        className="table-tree timegraph-tree"
                        hideFillers={true}
                    />
                </div>
            </>
        );
    }

    onCtxMenu(event: React.MouseEvent<HTMLDivElement>, id: number): void {
        event.preventDefault();
        event.stopPropagation();

        if (
            !this.state.menuItems ||
            (this.state.menuItems.items.length <= 0 && this.state.menuItems.submenus.length <= 0)
        ) {
            return;
        }

        // If the id that the context menu was triggered from is not in multi-selected-rows, we treat this as a row click
        if (!this.state.multiSelectedRows?.includes(id)) {
            this.onRowClick(id);
        }

        const refNode = this.treeRef.current;
        let calculatedX = 0;
        let calculatedY = 0;
        if (refNode) {
            calculatedX = event.clientX - refNode.getBoundingClientRect().left;
            calculatedY = event.clientY - refNode.getBoundingClientRect().top;
        }

        const { show } = useContextMenu({
            id: MENU_ID + this.props.outputDescriptor.id
        });

        show(event, {
            props: {},
            position: { x: calculatedX, y: calculatedY }
        });
    }

    protected handleItemClick = (params: ItemParams): void => {
        const props = {
            selectedRows: this.getEntryModelsForRowIds(this.state.multiSelectedRows)
        };
        const signalPayload: ContextMenuItemClickedSignalPayload = new ContextMenuItemClickedSignalPayload(
            this.props.outputDescriptor.id,
            params.data.itemId,
            props,
            params.data.parentMenuId
        );
        signalManager().emit('CONTEXT_MENU_ITEM_CLICKED', signalPayload);
    };

    protected getEntryModelsForRowIds = (
        ids: number[] | undefined
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ): { id: number; parentId?: number; metadata?: { [key: string]: any } }[] => {
        if (!ids) {
            return [];
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const entryModels: { id: number; parentId?: number; metadata?: { [key: string]: any } }[] = [];
        for (const id of ids) {
            const element = this.state.timegraphTree.find(el => el.id === id);
            if (element) {
                entryModels.push({ id: element.id, parentId: element.parentId, metadata: element.metadata });
            }
        }
        return entryModels;
    };

    renderContextMenu(): React.ReactNode {
        if (
            !this.state.menuItems ||
            (this.state.menuItems.items.length <= 0 && this.state.menuItems.submenus.length <= 0)
        ) {
            return <></>;
        }
        return (
            <React.Fragment>
                <Menu
                    id={MENU_ID + this.props.outputDescriptor.id}
                    theme={this.props.backgroundTheme}
                    animation={'fade'}
                >
                    {this.renderSubMenu(this.state.menuItems.submenus)}
                    {this.state.menuItems.submenus.length > 0 && <Separator></Separator>}
                    {this.renderItems(this.state.menuItems.items)}
                </Menu>
            </React.Fragment>
        );
    }

    renderSubMenu(submenus: SubMenu[]): React.ReactNode {
        return (
            <React.Fragment>
                {submenus && submenus.length > 0 ? (
                    submenus.map(menu => (
                        <Submenu label={menu.label} id={menu.id} key={menu.id}>
                            {menu.submenu && this.renderSubMenu([menu.submenu])}
                            {this.renderItems(menu.items)}
                        </Submenu>
                    ))
                ) : (
                    <></>
                )}
            </React.Fragment>
        );
    }

    renderItems(items: MenuItem[]): React.ReactNode {
        return (
            <React.Fragment>
                {items && items.length > 0 ? (
                    items.map(item => (
                        <Item
                            key={item.id}
                            id={item.id}
                            onClick={this.handleItemClick}
                            data={{
                                itemId: item.id,
                                itemLabel: item.label,
                                parentMenuId: item.parentMenuId
                            }}
                        >
                            {item.label}
                        </Item>
                    ))
                ) : (
                    <></>
                )}
            </React.Fragment>
        );
    }

    renderYAxis(): React.ReactNode {
        return undefined;
    }

    renderChart(): React.ReactNode {
        return (
            <React.Fragment>
                <div
                    id="timegraph-main"
                    className="ps__child--consume"
                    onWheel={ev => {
                        ev.preventDefault();
                        ev.stopPropagation();
                    }}
                    style={{ height: this.props.style.height }}
                >
                    {this.renderTimeGraphContent()}
                </div>
                {this.state.outputStatus === ResponseStatus.RUNNING && (
                    <div className="analysis-running-overflow" style={{ width: this.getChartWidth() }}>
                        <div>
                            <FontAwesomeIcon icon={faSpinner} spin style={{ marginRight: '5px' }} />
                            <span>Analysis running</span>
                        </div>
                    </div>
                )}
            </React.Fragment>
        );
    }

    resultsAreEmpty(): boolean {
        return this.state.timegraphTree.length === 0;
    }

    private isFilteredIn(row: TimelineChart.TimeGraphRowModel, strategy?: string): boolean {
        if (row.states.length === 1 && row.states[0].range.start === row.states[0].range.end) {
            // intentionally empty row should be visible
            return true;
        }
        let lastEnd: bigint | undefined = undefined;
        for (const state of row.states) {
            if (state.data?.style && (state.data?.tags === undefined || state.data?.tags < 4)) {
                // row with a non-null state that is not excluded should be visible
                return true;
            }
            if (strategy === 'SAMPLED' && lastEnd && lastEnd < state.range.start) {
                // row with gaps should be visible when strategy is SAMPLED
                return true;
            }
            lastEnd = state.range.end;
        }
        // empty row should be hidden
        return false;
    }

    get shouldHideEmptyNodes(): boolean {
        return this.state.filters.length > 0;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private async fetchTooltip(element: TimeGraphComponent<any>): Promise<{ [key: string]: string } | undefined> {
        if (element instanceof TimeGraphStateComponent) {
            const label = element.model.label ? element.model.label : '';
            const elementRange = element.model.range;
            const offset = this.props.viewRange.getOffset();
            let start: string | undefined;
            let end: string | undefined;
            if (this.props.unitController.numberTranslator) {
                start = this.props.unitController.numberTranslator(elementRange.start) + ' s';
                end = this.props.unitController.numberTranslator(elementRange.end) + ' s';
            }
            start = start ? start : (elementRange.start + (offset ? offset : BigInt(0))).toString() + ' ns';
            end = end ? end : (elementRange.end + (offset ? offset : BigInt(0))).toString() + ' ns';
            const duration = (elementRange.end - elementRange.start).toString() + ' ns';
            const tooltip = await this.tspDataProvider.fetchStateTooltip(element, this.props.viewRange);
            return this.filterTooltip({
                Label: label,
                'Start time': start,
                'End time': end,
                Duration: duration,
                Row: element.row.model.name,
                ...tooltip
            });
        } else if (element instanceof TimeGraphAnnotationComponent) {
            const category = element.model.category ? element.model.category : 'Label';
            const label = element.model.label ? element.model.label : '';
            const elementRange = element.model.range;
            const offset = this.props.viewRange.getOffset();
            let start: string | undefined;
            let end: string | undefined;
            if (this.props.unitController.numberTranslator) {
                start = this.props.unitController.numberTranslator(elementRange.start) + ' s';
                end = this.props.unitController.numberTranslator(elementRange.end) + ' s';
            }
            start = start ? start : (elementRange.start + (offset ? offset : BigInt(0))).toString() + ' ns';
            end = end ? end : (elementRange.end + (offset ? offset : BigInt(0))).toString() + ' ns';
            const tooltip = await this.tspDataProvider.fetchAnnotationTooltip(element, this.props.viewRange);
            if (start === end) {
                return this.filterTooltip({
                    [category]: label,
                    Timestamp: start,
                    Row: element.row.model.name,
                    ...tooltip
                });
            } else {
                return this.filterTooltip({
                    [category]: label,
                    'Start time': start,
                    'End time': end,
                    Row: element.row.model.name,
                    ...tooltip
                });
            }
        }
    }

    private filterTooltip(fullTooltip: { [key: string]: string }) {
        Object.keys(fullTooltip).forEach(key => {
            // eslint-disable-next-line no-null/no-null
            if (fullTooltip[key as keyof typeof fullTooltip] === null) {
                delete fullTooltip[key as keyof typeof fullTooltip];
            }
        });
        return fullTooltip;
    }

    private renderTimeGraphContent() {
        return (
            <div id="main-timegraph-content" ref={this.horizontalContainer} style={{ height: this.props.style.height }}>
                {this.getChartContainer()}
                {this.getMarkersContainer()}
                {this.getSearchBar()}
            </div>
        );
    }

    private getSearchBar() {
        return (
            <div
                id={this.props.traceId + this.props.outputDescriptor.id + 'searchBar'}
                className="timegraph-search-bar"
            >
                <TextField
                    InputProps={{
                        placeholder: 'Search',
                        startAdornment: (
                            <InputAdornment
                                sx={{
                                    color: 'var(--trace-viewer-ui-font-color0)'
                                }}
                                position="start"
                            >
                                <i className="codicon codicon-search"></i>
                            </InputAdornment>
                        ),
                        className: 'timegraph-search-box',
                        endAdornment: (
                            <InputAdornment
                                sx={{
                                    color: 'var(--trace-viewer-ui-font-color0)'
                                }}
                                position="end"
                            >
                                <button className="remove-search-button" onClick={this.clearSearchBox}>
                                    <i className="codicon codicon-close"></i>
                                </button>
                            </InputAdornment>
                        )
                    }}
                    value={this.state.searchString}
                    onChange={this.handleSearchChange}
                    onKeyDown={this.handleKeyDown}
                />
                {this.state.filters.map((filter, index) => (
                    <Chip
                        key={index}
                        label={filter}
                        onDelete={() => this.removeFilter(filter)}
                        className="filter-chip"
                    />
                ))}
            </div>
        );
    }

    private handleSearchChange(event: React.ChangeEvent<HTMLInputElement>) {
        this.setState({ searchString: event.target.value ?? '' });
    }

    private handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (
            event.key === 'Enter' &&
            this.state.searchString.trim() &&
            event.target instanceof HTMLInputElement &&
            event.target.classList.contains('MuiInputBase-input')
        ) {
            this.addFilter(this.state.searchString.trim());
            this.setState({ searchString: '' });
        }
    };

    private addFilter = (filter: string) => {
        this.setState(prevState => ({ filters: [...prevState.filters, filter], emptyNodes: [] }));
    };

    private removeFilter = (filter: string) => {
        this.setState(prevState => ({ filters: prevState.filters.filter(f => f !== filter), emptyNodes: [] }));
    };

    private filterExpressionsMap() {
        const filterExpressionsMap: { [key: number]: string[] } = {};
        if (this.state.searchString) {
            const DIMMED = 1;
            filterExpressionsMap[DIMMED] = [this.state.searchString]; // For greying out
        }
        if (this.state.filters.length > 0) {
            const FILTERED = 4;
            filterExpressionsMap[FILTERED] = this.state.filters; // For filtering
        }
        if (Object.keys(filterExpressionsMap).length > 0) {
            return filterExpressionsMap;
        } else {
            return undefined;
        }
    }

    private clearSearchBox() {
        this.setState({ searchString: '' });
    }

    private getMarkersContainer() {
        return (
            <ReactTimeGraphContainer
                options={{
                    id: 'timegraph-chart-1',
                    height: this.getMarkersLayerHeight(),
                    width: this.getChartWidth(),
                    backgroundColor: this.props.style.chartBackgroundColor,
                    lineColor: this.props.style.lineColor,
                    classNames: 'horizontal-canvas'
                }}
                addWidgetResizeHandler={this.props.addWidgetResizeHandler}
                removeWidgetResizeHandler={this.props.removeWidgetResizeHandler}
                unitController={this.props.unitController}
                id="timegraph-chart-1"
                layers={[this.markersChartLayer, this.markerChartCursors]}
            />
        );
    }

    private getChartContainer() {
        const grid = new TimeGraphChartGrid(
            'timeGraphGrid',
            this.props.style.rowHeight,
            this.props.backgroundTheme === 'light' ? 0xdddddd : 0x34383c
        );
        const selectionRange = new TimeGraphChartSelectionRange('chart-selection-range', {
            color: this.props.style.cursorColor
        });
        return (
            <ReactTimeGraphContainer
                ref={this.containerRef}
                options={{
                    id: this.props.traceId + this.props.outputDescriptor.id + 'focusContainer',
                    height:
                        parseInt(this.props.style.height.toString()) -
                        this.getMarkersLayerHeight() -
                        (document.getElementById(this.props.traceId + this.props.outputDescriptor.id + 'searchBar')
                            ?.offsetHeight ?? 0),
                    width: this.getChartWidth(),
                    backgroundColor: this.props.style.chartBackgroundColor,
                    lineColor: this.props.backgroundTheme === 'light' ? 0xdddddd : 0x34383c,
                    classNames: 'horizontal-canvas'
                }}
                addWidgetResizeHandler={this.props.addWidgetResizeHandler}
                removeWidgetResizeHandler={this.props.removeWidgetResizeHandler}
                unitController={this.props.unitController}
                id={this.props.traceId + this.props.outputDescriptor.id + 'focusContainer'}
                layers={[
                    grid,
                    this.chartLayer,
                    selectionRange,
                    this.chartCursors,
                    this.arrowLayer,
                    this.rangeEventsLayer
                ]}
            />
        );
    }

    setFocus(): void {
        if (document.getElementById(this.props.traceId + this.props.outputDescriptor.id + 'focusContainer')) {
            document.getElementById(this.props.traceId + this.props.outputDescriptor.id + 'focusContainer')?.focus();
        } else {
            document.getElementById(this.props.traceId + this.props.outputDescriptor.id)?.focus();
        }
    }

    protected getVerticalScrollbar(): JSX.Element {
        return (
            <ReactTimeGraphContainer
                id="vscroll"
                options={{
                    id: 'vscroll',
                    width: 10,
                    height: parseInt(this.props.style.height.toString()),
                    backgroundColor: this.props.style.naviBackgroundColor
                }}
                addWidgetResizeHandler={this.props.addWidgetResizeHandler}
                removeWidgetResizeHandler={this.props.removeWidgetResizeHandler}
                unitController={this.props.unitController}
                layers={[this.vscrollLayer]}
            ></ReactTimeGraphContainer>
        );
    }

    private async onElementSelected(element: TimeGraphStateComponent | undefined) {
        let tooltipObject = undefined;
        if (element && this.props.viewRange) {
            tooltipObject = await this.fetchTooltip(element);
        }
        if (tooltipObject) {
            signalManager().emit(
                'ITEM_PROPERTIES_UPDATED',
                new ItemPropertiesSignalPayload(tooltipObject, this.props.traceId, this.props.outputDescriptor.id)
            );
        }
    }

    private getTimegraphRowIds() {
        const { timegraphTree, columns, collapsedNodes } = this.state;
        const rowIds = getAllExpandedNodeIds(listToTree(timegraphTree, columns), collapsedNodes);
        return { rowIds };
    }

    private async fetchTimegraphData(
        range: TimelineChart.TimeGraphRange,
        resolution: number,
        fetchArrows: boolean,
        rowIds?: number[],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        additionalProperties?: { [key: string]: any }
    ) {
        if (document.getElementById(this.props.traceId + this.props.outputDescriptor.id + 'handleSpinner')) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            document.getElementById(
                this.props.traceId + this.props.outputDescriptor.id + 'handleSpinner'
            )!.style.visibility = 'visible';
        }

        const strategy = additionalProperties?.filter_query_parameters?.strategy;
        const ids = rowIds ? rowIds : this.getTimegraphRowIds().rowIds;
        const { start, end } = range;
        const newRange: TimelineChart.TimeGraphRange = range;
        const nbTimes = Math.ceil(Number(end - start) / resolution) + 1;
        const timeGraphData: TimelineChart.TimeGraphModel = await this.tspDataProvider.getData(
            ids,
            this.state.timegraphTree,
            fetchArrows,
            this.props.range,
            newRange,
            nbTimes,
            this.props.markerCategories,
            this.props.markerSetId,
            additionalProperties
        );
        this.updateMarkersData(timeGraphData.rangeEvents, newRange, nbTimes);
        this.rangeEventsLayer.addRangeEvents(timeGraphData.rangeEvents);

        if (document.getElementById(this.props.traceId + this.props.outputDescriptor.id + 'handleSpinner')) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            document.getElementById(
                this.props.traceId + this.props.outputDescriptor.id + 'handleSpinner'
            )!.style.visibility = 'hidden';
        }

        let rows = timeGraphData ? timeGraphData.rows : [];
        let emptyNodes: number[] = [...this.state.emptyNodes];
        if (this.shouldHideEmptyNodes) {
            rows = rows.filter(row => {
                if (this.isFilteredIn(row, strategy)) {
                    emptyNodes = emptyNodes.filter(id => id !== row.id);
                    return true;
                }
                if (!emptyNodes.includes(row.id)) {
                    emptyNodes.push(row.id);
                }
                return false;
            });
        } else {
            emptyNodes = [];
        }

        if (fetchArrows) {
            this.arrowLayer.addArrows(
                timeGraphData.arrows,
                this.getTimegraphRowIds().rowIds.filter(rowId => !emptyNodes.includes(rowId))
            );
        }
        this.setState({ emptyNodes });

        // Apply the pending selection here since the row provider had been called before this method.
        if (this.pendingSelection) {
            const foundElement = this.pendingSelection;
            this.pendingSelection = undefined;
            this.selectAndReveal(foundElement);
        }
        return {
            rows: rows,
            range: newRange,
            resolution: resolution
        };
    }

    private updateMarkersData(
        rangeEvents: TimelineChart.TimeGraphAnnotation[],
        newRange: TimelineChart.TimeGraphRange,
        newResolution: number
    ) {
        const annotationEntries: Entry[] = [];
        const markers: Map<string, TimelineChart.TimeGraphState[]> = new Map();
        const categories: string[] = [];
        const rows: TimelineChart.TimeGraphRowModel[] = [];
        const filteredEvents = rangeEvents.filter(event => this.selectedMarkerCategories?.includes(event.category));

        filteredEvents.forEach((event, idx) => {
            const categoryName = event.category;
            if (!markers.has(categoryName)) {
                markers.set(categoryName, []);
                categories.push(categoryName);
            }
            const rowId = categories.indexOf(categoryName) + 1;
            const states = markers.get(categoryName) || [];
            const state = {
                id: rowId + '-' + idx,
                range: {
                    start: event.range.start,
                    end: event.range.end
                },
                label: event.label,
                data: {
                    style: event.data?.style,
                    annotation: event
                }
            };
            states.push(state);
        });

        if (markers.size > 0) {
            const defaultRow = {
                id: 0,
                name: '',
                range: {
                    start: this.props.viewRange.getStart(),
                    end: this.props.viewRange.getStart() + this.props.unitController.absoluteRange
                },
                states: [],
                annotations: [],
                prevPossibleState: BigInt(Number.MIN_SAFE_INTEGER),
                nextPossibleState: BigInt(Number.MAX_SAFE_INTEGER)
            };
            rows.push(defaultRow);

            annotationEntries.push({
                id: 0,
                labels: [''],
                parentId: -1
            });
        }

        Array.from(markers.entries()).forEach(value => {
            const categoryName = value[0];
            const rowId = categories.indexOf(categoryName) + 1;
            annotationEntries.push({
                id: rowId,
                labels: [categoryName],
                parentId: 0
            });

            const row = {
                id: rowId,
                name: '',
                range: {
                    start: this.props.viewRange.getStart(),
                    end: this.props.viewRange.getStart() + this.props.unitController.absoluteRange
                },
                states: value[1],
                annotations: [],
                prevPossibleState: BigInt(Number.MIN_SAFE_INTEGER),
                nextPossibleState: BigInt(Number.MAX_SAFE_INTEGER)
            };
            rows.push(row);
        });

        const markerLayerData = {
            rows,
            range: newRange,
            resolution: newResolution
        };

        this.setState({ markerCategoryEntries: annotationEntries, markerLayerData: markerLayerData });
    }

    private getMarkersRowIds() {
        const rows =
            this.state.collapsedMarkerNodes.length !== 0 || !!!this.state.markerLayerData
                ? []
                : this.state.markerLayerData.rows;
        const rowIds: number[] = [];
        rows.forEach(row => {
            rowIds.push(row.id);
        });
        return {
            rowIds
        };
    }

    private async fetchMarkersData(range: TimelineChart.TimeGraphRange, resolution: number) {
        if (this.state.collapsedMarkerNodes.length !== 0 || !!!this.state.markerLayerData) {
            return {
                rows: [],
                range,
                resolution
            };
        }
        return this.state.markerLayerData;
    }

    private getRowStyle(row?: TimelineChart.TimeGraphRowModel) {
        let backgroundColor = 0x979797;

        if (row?.selected) {
            const colorString = getComputedStyle(document.body).getPropertyValue('--trace-viewer-selection-background');
            const colorNumber = convertColorStringToHexNumber(colorString);
            backgroundColor = colorNumber > 0 ? colorNumber : backgroundColor;
        }

        return {
            backgroundColor,
            backgroundOpacity: row?.selected ? 0.5 : 0,
            lineColor: this.props.backgroundTheme === 'light' ? 0xd3d3d3 : 0x3f4146,
            lineThickness: 1
        };
    }

    public doHandleOutputDataChangedSignal = async (outputs: OutputDescriptor[]): Promise<void> => {
        const desc = outputs.find(descriptor => descriptor.id === this.props.outputDescriptor.id);
        if (desc !== undefined) {
            await this.fetchTree();
            this._debouncedUpdateChart();
        }
    };

    private doHandleContextMenuContributed(payload: ContextMenuContributedSignalPayload) {
        if (payload.getOutputDescriptorId() === this.props.outputDescriptor.id) {
            const currentMenuItems: ContextMenuItems = this.state.menuItems
                ? this.state.menuItems
                : { items: [], submenus: [] };
            const menuItemsToAdd = payload.getMenuItems();
            if (currentMenuItems) {
                for (const submenu of menuItemsToAdd.submenus) {
                    // Only add menu entries with unique ids
                    if (currentMenuItems.submenus.findIndex(menu => menu.id === submenu.id) === -1) {
                        currentMenuItems.submenus.push(submenu);
                    }
                }
                for (const menuItem of menuItemsToAdd.items) {
                    if (currentMenuItems.items.findIndex(item => item.id === menuItem.id) === -1) {
                        currentMenuItems.items.push(menuItem);
                    }
                }
            }
            this.setState({ menuItems: currentMenuItems });
        }
    }

    public onThemeChange = (): void => {
        // Simulate a click on the selected row when theme changes.
        // This changes the color of the selected row to new theme.
        const selectedRow = this.state.selectedRow;
        if (selectedRow) {
            this.onRowClick(selectedRow);
        }
    };

    private getMarkerStateStyle(state: TimelineChart.TimeGraphState) {
        if (state.data && state.data.annotation) {
            const annotation = state.data.annotation;
            const style = this.getAnnotationStyle(annotation);
            return {
                color: style ? style.color : 0x000000,
                height: this.markerRowController.rowHeight,
                borderWidth: 1,
                borderColor: 0x000000
            };
        }

        return this.getStateStyle(state);
    }

    private getStateStyle(state: TimelineChart.TimeGraphState) {
        const styleModel = this.state.styleModel;
        if (styleModel) {
            const metadata = state.data;
            if (metadata && metadata.style) {
                const elementStyle: OutputElementStyle = metadata.style;
                const backgroundColor = this.styleProvider.getColorStyle(
                    elementStyle,
                    StyleProperties.BACKGROUND_COLOR
                );
                const heightFactor = this.styleProvider.getNumberStyle(elementStyle, StyleProperties.HEIGHT);
                let height = this.props.style.rowHeight * 0.8;
                if (heightFactor) {
                    height = heightFactor * height;
                }
                const borderStyle = this.styleProvider.getStyle(elementStyle, StyleProperties.BORDER_STYLE);
                let borderColor = undefined;
                let borderWidth = undefined;
                if (borderStyle && borderStyle !== 'none') {
                    borderColor = this.styleProvider.getColorStyle(elementStyle, StyleProperties.BORDER_COLOR);
                    if (borderColor === undefined) {
                        borderColor = { color: 0x000000, alpha: 1 };
                    }
                    borderWidth = this.styleProvider.getNumberStyle(elementStyle, StyleProperties.BORDER_WIDTH);
                    if (borderWidth === undefined) {
                        borderWidth = 1;
                    }
                }
                return {
                    color: backgroundColor ? backgroundColor.color : 0x000000,
                    opacity: metadata.tags && metadata.tags === 1 ? 0.3 : backgroundColor ? backgroundColor.alpha : 1.0,
                    height: height,
                    borderWidth: state.selected ? 2 : borderWidth ? borderWidth : 0,
                    borderColor: state.selected ? 0xeef20c : borderColor ? borderColor.color : 0x000000
                };
            }
            return undefined;
        }
        return this.getDefaultStateStyle(state);
    }

    private getDefaultStateStyle(state: TimelineChart.TimeGraphState) {
        const styleProvider = new StyleProvider(
            this.props.outputDescriptor.id,
            this.props.traceId,
            this.props.tspClient
        );
        const styles = styleProvider.getStylesTmp();
        const backupStyles: TimeGraphStateStyle[] = [
            {
                color: 0x3891a6,
                height: this.props.style.rowHeight * 0.8
            },
            {
                color: 0x4c5b5c,
                height: this.props.style.rowHeight * 0.7
            },
            {
                color: 0xfde74c,
                height: this.props.style.rowHeight * 0.6
            },
            {
                color: 0xdb5461,
                height: this.props.style.rowHeight * 0.5
            },
            {
                color: 0xe3655b,
                height: this.props.style.rowHeight * 0.4
            },
            {
                color: 0xea8f87,
                height: this.props.style.rowHeight * 0.9
            },
            {
                color: 0xde636f,
                height: this.props.style.rowHeight * 0.3
            }
        ];

        let style: TimeGraphStateStyle | undefined = backupStyles[0];
        const val = state.label ?? '';
        const modelData = state.data;
        if (modelData) {
            const outputStyle = modelData.style;
            if (!outputStyle) {
                return {
                    color: 0xcacaca,
                    height: this.props.style.rowHeight * 0.5,
                    borderWidth: state.selected ? 2 : 0,
                    borderColor: 0xeef20c
                };
            }

            const stateStyle = outputStyle as OutputElementStyle;
            const elementStyle = styles[stateStyle.parentKey];
            if (elementStyle) {
                return {
                    color: parseInt(elementStyle.color, 16),
                    height: this.props.style.rowHeight * elementStyle.height,
                    borderWidth: state.selected ? 2 : 0,
                    borderColor: 0xeef20c
                };
            }

            style = this.styleMap.get(stateStyle.parentKey);
            if (style === undefined) {
                style = backupStyles[(Math.abs(hash(stateStyle.parentKey)) as number) % backupStyles.length];
                this.styleMap.set(stateStyle.parentKey, style);
            }
            return {
                color: style.color,
                height: style.height,
                borderWidth: state.selected ? 2 : 0,
                borderColor: 0xeef20c
            };
        }

        style = this.styleMap.get(val);
        if (!style) {
            style = backupStyles[this.styleMap.size % backupStyles.length];
            this.styleMap.set(val, style);
        }
        return {
            color: style.color,
            height: style.height,
            borderWidth: state.selected ? 2 : 0,
            borderColor: 0xeef20c
        };
    }

    private getAnnotationStyle(annotation: TimelineChart.TimeGraphAnnotation) {
        const styleModel = this.state.styleModel;
        if (styleModel) {
            const metadata = annotation.data;
            if (metadata && metadata.style) {
                const elementStyle: OutputElementStyle = metadata.style;
                const symbolType = this.styleProvider.getStyle(elementStyle, StyleProperties.SYMBOL_TYPE);
                const color = this.styleProvider.getColorStyle(elementStyle, StyleProperties.COLOR);
                const heightFactor = this.styleProvider.getNumberStyle(elementStyle, StyleProperties.HEIGHT);
                let symbolSize = (this.props.style.rowHeight * 0.8) / 2;
                if (heightFactor) {
                    symbolSize = heightFactor * symbolSize;
                }
                const vAlign = this.styleProvider.getStyle(elementStyle, StyleProperties.VERTICAL_ALIGN);
                return {
                    symbol: symbolType ? symbolType : 'none',
                    size: symbolSize,
                    color: color ? color.color : 0x000000,
                    opacity: color ? color.alpha : 1.0,
                    verticalAlign: vAlign ? vAlign : 'middle'
                };
            }
        }
        return undefined;
    }

    private expandParents(entry: TimeGraphEntry) {
        let foundNode = this.state.timegraphTree.find(node => node.id === entry?.id);
        if (foundNode) {
            let parentId: number | undefined = foundNode.parentId;
            const ids: number[] = [];
            while (parentId && parentId >= 0) {
                ids.push(parentId);
                foundNode = this.state.timegraphTree.find(node => node.id === parentId);
                parentId = foundNode?.parentId;
            }

            let newList = [...this.state.collapsedNodes];
            ids.forEach(parentIds => {
                const exist = this.state.collapsedNodes.find(expandId => expandId === parentIds);
                if (exist !== undefined) {
                    newList = newList.filter(collapsed => parentIds !== collapsed);
                }
            });
            const retVal = newList.length === this.state.collapsedNodes.length;
            this.setState({ collapsedNodes: newList }, this.updateTotalHeight);
            return retVal;
        }
    }

    /**
     *  This method is passed down all the way to TableCell component.
     *  It communicates a row-selection with the timeline-chart component.
     *  @param {number} id TreeNode id number
     */
    public onRowClick = (id: number): void => {
        const rowIndex = getIndexOfNode(
            id,
            listToTree(this.state.timegraphTree, this.state.columns),
            this.state.collapsedNodes,
            this.state.emptyNodes
        );
        this.chartLayer.selectAndReveal(rowIndex);
        if (this.rowController.selectedRow?.id !== id) {
            // This highlights the left side if the row is loading.
            this.setState({ selectedRow: id });
        }

        // Regular clicking on a row should clear the multi selected rows to only include the clicked row
        this.setState({ multiSelectedRows: [id] });
    };

    public onMultipleRowClick = (id: number, isShiftClicked?: boolean): void => {
        const tree = listToTree(this.state.timegraphTree, this.state.columns);
        const rowIndex = getIndexOfNode(id, tree, this.state.collapsedNodes, this.state.emptyNodes);

        if (isShiftClicked) {
            // Perform shift action based on selectedRow value
            if (this.state.selectedRow !== undefined) {
                const treeNodeIds = getAllExpandedNodeIds(tree, this.state.collapsedNodes, this.state.emptyNodes);
                const lastSelectedRowIndex = getIndexOfNode(
                    this.state.selectedRow,
                    tree,
                    this.state.collapsedNodes,
                    this.state.emptyNodes
                );
                this.handleShiftClick(rowIndex, lastSelectedRowIndex, treeNodeIds);
            } else {
                // Do not have a previous selection therefore treat this as a normal row click
                this.onRowClick(id);
            }
        } else {
            const rows = this.state.multiSelectedRows ? this.state.multiSelectedRows.slice() : [];
            // This indicates that the row is being deselected
            if (rows.includes(id)) {
                const index = rows.indexOf(id);
                /**
                 *  It is possible for the entry being deselected to be selectedRow.
                 *  In this case we have to update the selectedRow state to point to another row
                 *  We will try to set this to previously selected row that is part of the multi-selection, otherwise it should be set to undefined
                 */
                if (id === this.state.selectedRow) {
                    const prevRowId = rows.at(index - 1);
                    if (prevRowId && prevRowId !== id) {
                        const prevRowIndex = getIndexOfNode(
                            prevRowId,
                            tree,
                            this.state.collapsedNodes,
                            this.state.emptyNodes
                        );
                        this.chartLayer.selectAndReveal(prevRowIndex);
                    } else {
                        this.setState({ selectedRow: undefined });
                        this.chartLayer.selectRow(undefined);
                    }
                }
                rows.splice(index, 1);
            } else {
                // No selectedRow - delegate to onRowClick as it is a first selection
                if (this.state.selectedRow === undefined) {
                    this.onRowClick(id);
                    return;
                }
                rows?.push(id);
            }
            this.setState({ multiSelectedRows: rows });
        }
    };

    public onMarkerRowClick = (id: number): void => {
        const rowIndex = getIndexOfNode(
            id,
            listToTree(this.state.markerCategoryEntries, this.state.columns),
            this.state.collapsedNodes,
            this.state.emptyNodes
        );
        this.markersChartLayer.selectAndReveal(rowIndex);
    };

    public onSelectionChange = (row: TimelineChart.TimeGraphRowModel): void => {
        this.setState({ selectedRow: row.id });
    };

    public onMarkerSelectionChange = (row: TimelineChart.TimeGraphRowModel): void => {
        this.setState({ selectedMarkerRow: row.id });
    };

    private handleShiftClick = (currentIndex: number, lastSelectedRowIndex: number, treeNodeIds: number[]): void => {
        const shiftClickedRows: number[] = [];
        let startIndex = 0;
        let endIndex = 0;

        if (lastSelectedRowIndex < currentIndex) {
            startIndex = lastSelectedRowIndex;
            endIndex = currentIndex;
        } else {
            startIndex = currentIndex;
            endIndex = lastSelectedRowIndex;
        }

        if (startIndex < 0 || startIndex >= treeNodeIds.length || endIndex >= treeNodeIds.length) {
            return;
        }
        for (let i = startIndex; i <= endIndex; i++) {
            const nodeId = treeNodeIds.at(i);
            if (nodeId) {
                shiftClickedRows.push(nodeId);
            }
        }
        this.setState({ multiSelectedRows: shiftClickedRows });
    };

    private selectAndReveal(item: TimeGraphEntry) {
        const rowIndex = getIndexOfNode(
            item.id,
            listToTree(this.state.timegraphTree, this.state.columns),
            this.state.collapsedNodes,
            this.state.emptyNodes
        );
        this.chartLayer.selectAndReveal(rowIndex);
    }
}
