/* eslint-disable @typescript-eslint/no-explicit-any */
import { AbstractOutputComponent, AbstractOutputProps, AbstractOutputState } from './abstract-output-component';
import * as React from 'react';
import { Menu, Item, useContextMenu, ItemParams } from 'react-contexify';
import { QueryHelper } from 'tsp-typescript-client/lib/models/query/query-helper';
import { Entry } from 'tsp-typescript-client/lib/models/entry';
import { DataType } from 'tsp-typescript-client/lib/models/data-type';
import { ResponseStatus } from 'tsp-typescript-client/lib/models/response/responses';
import { EntryTree } from './utils/filter-tree/entry-tree';
import { getAllExpandedNodeIds } from './utils/filter-tree/utils';
import { TreeNode } from './utils/filter-tree/tree-node';
import ColumnHeader from './utils/filter-tree/column-header';
import debounce from 'lodash.debounce';
import { signalManager } from 'traceviewer-base/lib/signals/signal-manager';
import '../../style/react-contextify.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner } from '@fortawesome/free-solid-svg-icons';

type DataTreeOutputProps = AbstractOutputProps & {};

type DataTreeOuputState = AbstractOutputState & {
    selectedSeriesId: number[];
    xyTree: Entry[];
    collapsedNodes: number[];
    orderedNodes: number[];
    columns: ColumnHeader[];
};

const MENU_ID = 'datatree.context.menuId ';

export class DataTreeOutputComponent extends AbstractOutputComponent<AbstractOutputProps, DataTreeOuputState> {
    treeRef: React.RefObject<HTMLDivElement> = React.createRef();

    private _debouncedFetchSelectionData = debounce(() => this.fetchSelectionData(), 500);

    constructor(props: AbstractOutputProps) {
        super(props);
        this.state = {
            outputStatus: ResponseStatus.RUNNING,
            selectedSeriesId: [],
            xyTree: [],
            collapsedNodes: [],
            orderedNodes: [],
            columns: [{ title: 'Name', sortable: true }]
        };
        this.addPinViewOptions();
        this.addOptions('Export to CSV...', () => this.exportOutput());
    }

    componentDidMount(): void {
        this.waitAnalysisCompletion();
    }

    async fetchTree(): Promise<ResponseStatus> {
        const parameters = QueryHelper.timeRangeQuery(this.props.range.getStart(), this.props.range.getEnd());
        // TODO: use the data tree endpoint instead of the xy tree endpoint
        const tspClientResponse = await this.tryFetchDataTree(parameters);
        const treeResponse = tspClientResponse.getModel();
        if (tspClientResponse.isOk() && treeResponse) {
            if (treeResponse.model) {
                const headers = treeResponse.model.headers;
                const columns = [];
                if (headers && headers.length > 0) {
                    headers.forEach(header => {
                        columns.push({
                            title: header.name,
                            sortable: true,
                            resizable: true,
                            tooltip: header.tooltip,
                            dataType: header.dataType
                        });
                    });
                } else {
                    columns.push({ title: 'Name', sortable: true });
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
        return this.state.xyTree.length ? (
            <div
                tabIndex={0}
                id={this.props.traceId + this.props.outputDescriptor.id + 'focusContainer'}
                className="scrollable"
                style={{ height: this.props.style.height }}
            >
                <EntryTree
                    entries={this.state.xyTree}
                    showCheckboxes={false}
                    collapsedNodes={this.state.collapsedNodes}
                    onContextMenu={this.onContextMenu}
                    onToggleCollapse={this.onToggleCollapse}
                    onOrderChange={this.onOrderChange}
                    headers={this.state.columns}
                />
            </div>
        ) : undefined;
    }

    renderMainArea(): React.ReactNode {
        return (
            <React.Fragment>
                {this.state.outputStatus === ResponseStatus.COMPLETED ? (
                    <div>
                        {this.renderContextMenu()}
                        <div
                            ref={this.treeRef}
                            className="output-component-tree disable-select"
                            style={{
                                height: this.props.style.height,
                                width: this.props.outputWidth - this.getHandleWidth()
                            }}
                        >
                            {this.renderTree()}
                        </div>
                    </div>
                ) : (
                    <div
                        tabIndex={0}
                        id={this.props.traceId + this.props.outputDescriptor.id + 'focusContainer'}
                        className="analysis-running-main-area"
                    >
                        <FontAwesomeIcon icon={faSpinner} spin style={{ marginRight: '5px' }} />
                        <span>Analysis running</span>
                    </div>
                )}
            </React.Fragment>
        );
    }

    renderContextMenu(): React.ReactNode {
        const timeRanges: string[] = [];
        const cols = this.state.columns;
        cols.forEach(col => {
            if (col.dataType === DataType.TIME_RANGE) {
                timeRanges.push(col.title);
            }
        });
        return (
            <React.Fragment>
                {' '}
                {
                    <Menu
                        id={MENU_ID + this.props.outputDescriptor.id}
                        theme={this.props.backgroundTheme}
                        animation={'fade'}
                    >
                        {timeRanges && timeRanges.length > 0 ? (
                            timeRanges.map(key => (
                                <Item key={key} id={key} onClick={this.handleItemClick}>
                                    Select {key}
                                </Item>
                            ))
                        ) : (
                            <></>
                        )}
                    </Menu>
                }
            </React.Fragment>
        );
    }

    protected handleItemClick = (args: ItemParams): void => {
        const tooltip: { [key: string]: string } = args.props.data;
        const min = tooltip[args.event.currentTarget.id];
        if (min !== undefined) {
            let rx = /\[(\d*),.*/g;
            let arr = rx.exec(min);
            let start: bigint | undefined = undefined;
            if (arr) {
                start = BigInt(arr[1]) - this.props.unitController.offset;
            }
            rx = /.*,(\d*)\]/g;
            arr = rx.exec(min);
            let end: bigint | undefined = undefined;
            if (arr) {
                end = BigInt(arr[1]) - this.props.unitController.offset;
            }
            if (start !== undefined && end !== undefined) {
                this.props.unitController.selectionRange = {
                    start,
                    end
                };
            }
        }
    };

    setFocus(): void {
        if (document.getElementById(this.props.traceId + this.props.outputDescriptor.id + 'focusContainer')) {
            document.getElementById(this.props.traceId + this.props.outputDescriptor.id + 'focusContainer')?.focus();
        } else {
            document.getElementById(this.props.traceId + this.props.outputDescriptor.id)?.focus();
        }
    }

    private onContextMenu = (event: React.MouseEvent<HTMLDivElement>, id: number): void => {
        event.preventDefault();
        event.stopPropagation();
        this.doContextMenu(event, id);
    };

    private async doContextMenu(event: React.MouseEvent<HTMLDivElement>, id: number): Promise<void> {
        if (this.state.xyTree) {
            const timeProperties: { [key: string]: string } = {};
            const entry = this.state.xyTree.find(e => e.id === id);
            if (entry && this.state.columns && this.state.columns.length > 0) {
                const cols = this.state.columns;
                for (let i = 0; i < cols.length; i++) {
                    if (cols[i].dataType === DataType.TIME_RANGE) {
                        timeProperties[cols[i].title] = entry.labels[i];
                    }
                }
            }

            if (Object.keys(timeProperties).length > 0) {
                const { show } = useContextMenu({
                    id: MENU_ID + this.props.outputDescriptor.id
                });

                show(event, {
                    props: {
                        data: timeProperties
                    },
                    position: this.getMenuPosition(event)
                });
            }
        }
    }
    getMenuPosition(event: React.MouseEvent<HTMLDivElement>): { x: number; y: number } {
        const refNode = this.treeRef.current;
        if (refNode) {
            return {
                // Compute position relative to treeRef
                x: event.clientX - refNode.getBoundingClientRect().left,
                y: event.clientY - refNode.getBoundingClientRect().top
            };
        }
        return {
            x: 0,
            y: 0
        };
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
        this.setState({ collapsedNodes: newList, orderedNodes: orderedIds });
    }

    private onOrderChange(ids: number[]) {
        this.setState({ orderedNodes: ids });
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
    }

    protected async fetchSelectionData(): Promise<void> {
        if (this.props.selectionRange) {
            let payload: any;
            if (this.props.selectionRange.getStart() < this.props.selectionRange.getEnd()) {
                payload = QueryHelper.timeRangeQuery(
                    this.props.selectionRange.getStart(),
                    this.props.selectionRange.getEnd()
                );
            } else {
                payload = QueryHelper.timeRangeQuery(
                    this.props.selectionRange.getEnd(),
                    this.props.selectionRange.getStart()
                );
            }

            payload.parameters.isFiltered = true;

            // TODO: use the data tree endpoint instead of the xy tree endpoint
            const tspClientResponse = await this.tryFetchDataTree(payload);
            const treeResponse = tspClientResponse.getModel();
            if (tspClientResponse.isOk() && treeResponse) {
                if (treeResponse.model) {
                    this.setState({
                        outputStatus: treeResponse.status,
                        xyTree: treeResponse.model.entries
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
        const focusContainer = document.getElementById(
            this.props.traceId + this.props.outputDescriptor.id + 'focusContainer'
        );
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
                signalManager().emit('SAVE_AS_CSV', this.props.traceId, tableString);
            }
        }
    }

    private async tryFetchDataTree(payload: any) {
        let tspClientResponse = await this.props.tspClient.fetchDataTree(
            this.props.traceId,
            this.props.outputDescriptor.id,
            payload
        );
        if (!tspClientResponse.isOk()) {
            // Older trace servers might not support fetchDatatTree endpoint. Fall-back to fetchXYTree
            tspClientResponse = await this.props.tspClient.fetchXYTree(
                this.props.traceId,
                this.props.outputDescriptor.id,
                payload
            );
        }
        return tspClientResponse;
    }
}
