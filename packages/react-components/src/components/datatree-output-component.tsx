/* eslint-disable @typescript-eslint/no-explicit-any */
import { AbstractOutputComponent, AbstractOutputProps, AbstractOutputState } from './abstract-output-component';
import * as React from 'react';
import { QueryHelper } from 'tsp-typescript-client/lib/models/query/query-helper';
import { Entry } from 'tsp-typescript-client/lib/models/entry';
import { ResponseStatus } from 'tsp-typescript-client/lib/models/response/responses';
import { EntryTree } from './utils/filter-tree/entry-tree';
import { getAllExpandedNodeIds } from './utils/filter-tree/utils';
import { TreeNode } from './utils/filter-tree/tree-node';
import ColumnHeader from './utils/filter-tree/column-header';
import { signalManager, Signals } from 'traceviewer-base/lib/signals/signal-manager';
import debounce from 'lodash.debounce';
import { ClickEvent, ControlledMenu, MenuItem } from '@szhsin/react-menu';
import '@szhsin/react-menu/dist/index.css';
import { QueryablePropertyDescriptor, QueryablePropertyModel } from 'tsp-typescript-client/lib/models/queryable-property';
import { Query } from 'tsp-typescript-client';

type DataTreeOutputProps = AbstractOutputProps & {
};

type DataTreeOuputState = AbstractOutputState & {
    selectedSeriesId: number[];
    xyTree: Entry[];
    collapsedNodes: number[];
    orderedNodes: number[];
    columns: ColumnHeader[];
    createContextMenu: boolean;
    toggleContextMenu: boolean;
    contextMenuPosX: number;
    contextMenuPosY: number;
    dataTreeSelectedRow: number;
    dataTreeSelectedCell: number;
};

export class DataTreeOutputComponent extends AbstractOutputComponent<AbstractOutputProps, DataTreeOuputState> {
    treeRef: React.RefObject<HTMLDivElement> = React.createRef();

    private _debouncedFetchSelectionData = debounce(() => this.fetchSelectionData(), 500);

    private _doHandleShowContextMenu = (payload: { xPos: number, yPos: number, nodeId: number, cellIndex: number, outputId: string}): void => this.showContextMenu(payload);

    constructor(props: AbstractOutputProps) {
        super(props);

        let takesQueryableProperties = false;
        if (this.props.outputDescriptor.queryableProperties) {
            for (const property of this.props.outputDescriptor.queryableProperties) {
                if (property.inputType == 'entry' && property.actionType == 'APPLY') {
                    takesQueryableProperties = true;
                }
            }
        }

        this.state = {
            outputStatus: ResponseStatus.RUNNING,
            selectedSeriesId: [],
            xyTree: [],
            collapsedNodes: [],
            orderedNodes: [],
            columns: [{title: 'Name', sortable: true}],
            optionsDropdownOpen: false,
            additionalOptions: true,
            createContextMenu: takesQueryableProperties,
            contextMenuPosX: 0,
            contextMenuPosY: 0,
            toggleContextMenu: false,
            dataTreeSelectedRow: 0,
            dataTreeSelectedCell: 0,
        };

        signalManager().on(Signals.DATATREE_OUTPUT_OPEN_CONTEXT_MENU, this._doHandleShowContextMenu);
    }

    componentDidMount(): void {
        this.waitAnalysisCompletion();
    }

    private showContextMenu(payload: { xPos: number, yPos: number, nodeId: number, cellIndex: number, outputId: string}): void {
        if (payload.outputId === this.props.outputDescriptor?.id) {
            this.setState({
                contextMenuPosX: payload.xPos,
                contextMenuPosY: payload.yPos,
                dataTreeSelectedRow: payload.nodeId,
                dataTreeSelectedCell: payload.cellIndex,
                toggleContextMenu: true
            });
        }
    }

    async fetchTree(): Promise<ResponseStatus> {
        const parameters = QueryHelper.timeRangeQuery(this.props.range.getStart(), this.props.range.getEnd());
        // TODO: use the data tree endpoint instead of the xy tree endpoint
        const tspClientResponse = await this.props.tspClient.fetchXYTree(this.props.traceId, this.props.outputDescriptor.id, parameters);
        const treeResponse = tspClientResponse.getModel();
        if (tspClientResponse.isOk() && treeResponse) {
            if (treeResponse.model) {
                const headers = treeResponse.model.headers;
                const columns = [];
                if (headers && headers.length > 0) {
                    headers.forEach(header => {
                        columns.push({title: header.name, sortable: true, resizable: true, tooltip: header.tooltip});
                    });
                } else {
                    columns.push({title: 'Name', sortable: true});
                }
                this.setState({
                    outputStatus: treeResponse.status,
                    xyTree: treeResponse.model.entries,
                    columns
                });
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

    resultsAreEmpty(): boolean {
        return this.state.xyTree.length === 0;
    }

    renderTree(): React.ReactNode | undefined {
        this.onToggleCollapse = this.onToggleCollapse.bind(this);
        this.onOrderChange = this.onOrderChange.bind(this);
        return this.state.xyTree.length
            ?   <div
                    tabIndex={0}
                    id={this.props.traceId + this.props.outputDescriptor.id + 'focusContainer'}
                    className='scrollable' style={{ height: this.props.style.height, width: this.getMainAreaWidth() }}
                >
                <EntryTree
                    entries={this.state.xyTree}
                    showCheckboxes={false}
                    collapsedNodes={this.state.collapsedNodes}
                    onToggleCollapse={this.onToggleCollapse}
                    onOrderChange={this.onOrderChange}
                    headers={this.state.columns}
                    outputDescriptorId={this.state.createContextMenu ? this.props.outputDescriptor.id : undefined}
                />
            </div>
            : undefined
            ;
    }

    renderMainArea(): React.ReactNode {
        return <React.Fragment>
            {this.state.outputStatus === ResponseStatus.COMPLETED ?
                <>
                    {this.state.createContextMenu && this.renderContextMenu()}
                    <div ref={this.treeRef} className='output-component-tree disable-select'
                        style={{ height: this.props.style.height, width: this.props.outputWidth }}
                    >
                        {this.renderTree()}
                    </div>
                </>:
                <div tabIndex={0} id={this.props.traceId + this.props.outputDescriptor.id + 'focusContainer'} className='analysis-running-main-area'>
                    <i className='fa fa-refresh fa-spin' style={{ marginRight: '5px' }} />
                    <span>Analysis running</span>
                </div>
            }
        </React.Fragment>;
    }

    renderContextMenu(): React.ReactNode {
        return <React.Fragment>
            {this.props.outputDescriptor.queryableProperties &&
                <ControlledMenu
                    state={this.state.toggleContextMenu ? 'open' : 'closed'}
                    onClose={() => this.setState({toggleContextMenu: false})}
                    anchorPoint={{x: this.state.contextMenuPosX, y: this.state.contextMenuPosY}}
                >
                    {this.props.outputDescriptor.queryableProperties.map((property, index) => (
                        property.inputType == 'entry' && property.actionType == 'APPLY' &&
                        <MenuItem
                            value={property.name}
                            key={index}
                            onClick={(e) => {
                                e.stopPropagation = true;
                                this.clickContextMenuItem(e, property);
                            }} 
                        >
                            {property.name}
                        </MenuItem>
                    ))
                    }
                </ControlledMenu>
            }
        </React.Fragment>;
    }

    private async clickContextMenuItem(e: ClickEvent, property: QueryablePropertyDescriptor) {
        let queryParams: any = {};
        for (const parameter of property.queryParams) {
            if (parameter == QueryHelper.REQUESTED_TIMERANGE_KEY) {
                if (this.props.selectionRange) {
                    if (this.props.selectionRange.getStart() < this.props.selectionRange.getEnd()) {
                        queryParams.requested_timerange = {start: this.props.range.getStart(), end: this.props.range.getEnd()};
                    } else {
                        queryParams.requested_timerange = {start: this.props.range.getEnd(), end: this.props.range.getStart()};
                    }
                }
            } else if (parameter == QueryHelper.REQUESTED_ITEMS_KEY) {
                queryParams.requested_items = [this.state.dataTreeSelectedRow];
            } else if (parameter == QueryHelper.REQUESTED_ELEMENT_KEY) {
                queryParams.REQUESTED_ELEMENT_KEY = this.state.dataTreeSelectedRow;
            } else if (parameter == QueryHelper.IS_FILTERED_KEY) {
                if (this.props.selectionRange) {
                    queryParams.isFiltered = true;
                }
            } else if (parameter == QueryHelper.REQUESTED_TABLE_INDEX_KEY) {
                queryParams.requested_table_index = this.state.dataTreeSelectedRow;
            } else if (parameter == QueryHelper.REQUESTED_TIMES_KEY) {
                if (this.props.selectionRange) {
                    if (this.props.selectionRange.getStart() < this.props.selectionRange.getEnd()) {
                        queryParams.requested_times = [this.props.range.getStart(), this.props.range.getEnd()];
                    } else {
                        queryParams.requested_times = [this.props.range.getEnd(), this.props.range.getStart()];
                    }
                }
            }
        }
        
        const tspClientResponse = await this.props.tspClient.fetchQueryableProperty(this.props.traceId, this.props.outputDescriptor.id, property.id, new Query(queryParams));
        const propertyResponse: any = tspClientResponse.getModel();
        if (tspClientResponse.isOk() && propertyResponse) {
            if (propertyResponse.model) {
                const model: QueryablePropertyModel = propertyResponse.model;
                for (const parameter of property.returnType) {
                    if (parameter == QueryHelper.REQUESTED_TIMERANGE_KEY) {
                        if (model.values && model.values.time_range_start && model.values.time_range_end) {
                            const offset = this.props.viewRange.getOffset() || BigInt(0);
                            this.props.unitController.selectionRange = {
                                start: BigInt(model.values.time_range_start) - offset,
                                end: BigInt(model.values.time_range_end) - offset
                            }
                        }
                    }
                }
            }
        }
    }
     
    setFocus(): void {
        if (document.getElementById(this.props.traceId + this.props.outputDescriptor.id + 'focusContainer')) {
            document.getElementById(this.props.traceId + this.props.outputDescriptor.id + 'focusContainer')?.focus();
        } else {
            document.getElementById(this.props.traceId + this.props.outputDescriptor.id)?.focus();
        }
    }

    private onToggleCollapse(id: number, nodes: TreeNode[]) {
        let newList = [...this.state.collapsedNodes];

        const exist = this.state.collapsedNodes.find(expandId => expandId === id);

        if (exist !== undefined) {
            newList = newList.filter(collapsed => id !== collapsed);
        } else {
            newList = newList.concat(id);
        }
        const orderedIds = getAllExpandedNodeIds(nodes, newList);
        this.setState({collapsedNodes: newList, orderedNodes: orderedIds});
    }

    private onOrderChange(ids: number[]) {
        this.setState({orderedNodes: ids});
    }

    protected async waitAnalysisCompletion(): Promise<void> {
        let outputStatus = this.state.outputStatus;
        const timeout = 500;
        while (this.state && outputStatus === ResponseStatus.RUNNING) {
            outputStatus = await this.fetchTree();
            await new Promise(resolve => setTimeout(resolve, timeout));
        }
    }

    componentWillUnmount(): void {
        // fix Warning: Can't perform a React state update on an unmounted component
        this.setState = (_state, _callback) => undefined;
        signalManager().off(Signals.DATATREE_OUTPUT_OPEN_CONTEXT_MENU, this._doHandleShowContextMenu);
    }

    protected async fetchSelectionData(): Promise<void> {
        if (this.props.selectionRange) {
            let payload: any;
            if (this.props.selectionRange.getStart() < this.props.selectionRange.getEnd()) {
                payload = QueryHelper.timeRangeQuery(this.props.selectionRange.getStart(), this.props.selectionRange.getEnd());
            } else {
                payload = QueryHelper.timeRangeQuery(this.props.selectionRange.getEnd(), this.props.selectionRange.getStart());
            }

            payload.parameters.isFiltered = true;

            // TODO: use the data tree endpoint instead of the xy tree endpoint
            const tspClientResponse = await this.props.tspClient.fetchXYTree(this.props.traceId, this.props.outputDescriptor.id, payload);
            const treeResponse = tspClientResponse.getModel();
            if (tspClientResponse.isOk() && treeResponse) {
                if (treeResponse.model) {
                    this.setState({
                        outputStatus: treeResponse.status,
                        xyTree: treeResponse.model.entries,
                    });
                }
            }
        }
    }

    async componentDidUpdate(prevProps: DataTreeOutputProps): Promise<void> {
        if (this.props.selectionRange && this.props.selectionRange !== prevProps.selectionRange) {
            this._debouncedFetchSelectionData();
        }
    }

    private async exportOutput(): Promise<void> {
        const focusContainer = document.getElementById(this.props.traceId + this.props.outputDescriptor.id + 'focusContainer');
        if (focusContainer) {
            const table = focusContainer.querySelector('div:nth-child(2) > table');
            if (table) {
                const rows = table.querySelectorAll('tr');

                const csvArray = [];
                for (let i = 0; i < rows.length; i++) {
                    const row = [];
                    const cols = rows[i].querySelectorAll('td, th');
                    for (let j = 0; j < cols.length - 1; j++) {
                        let data;
                        const content = cols[j].textContent;
                        if (content) {
                            data = content.replace(/\s*\|/g, '');
                        } else {
                            data = content;
                        }
                        row.push(data);
                    }
                    csvArray.push(row.join(','));
                }
                const tableString = csvArray.join('\n');

                const link = document.createElement('a');
                link.setAttribute('href', `data:text/csv;charset=utf-8,${encodeURIComponent(tableString)}`);
                link.setAttribute('download', (this.props.traceName ?? 'export') + ' - ' + this.props.outputDescriptor.name + '.csv');

                link.style.display = 'none';
                document.body.appendChild(link);

                link.click();

                document.body.removeChild(link);
            }
        }
    }

    protected showAdditionalOptions(): React.ReactNode {
        return <React.Fragment>
            <ul>
                <li className='drop-down-list-item' key={0} onClick={() => this.exportOutput()}>
                    <div className='drop-down-list-item-text'>Export to csv</div>
                </li>
            </ul>
        </React.Fragment>;
    }
}
