/* eslint-disable @typescript-eslint/no-explicit-any */
import { AbstractOutputComponent, AbstractOutputProps, AbstractOutputState } from './abstract-output-component';
import * as React from 'react';
import { QueryHelper } from 'tsp-typescript-client/lib/models/query/query-helper';
import { Entry } from 'tsp-typescript-client/lib/models/entry';
import { ResponseStatus } from 'tsp-typescript-client/lib/models/response/responses';
import { EntryTree } from './utils/filtrer-tree/entry-tree';
import { getAllExpandedNodeIds } from './utils/filtrer-tree/utils';
import { TreeNode } from './utils/filtrer-tree/tree-node';
import ColumnHeader from './utils/filtrer-tree/column-header';

type DataTreeOutputProps = AbstractOutputProps & {
};

type DataTreeOuputState = AbstractOutputState & {
    selectedSeriesId: number[];
    xyTree: Entry[];
    collapsedNodes: number[];
    orderedNodes: number[];
    columns: ColumnHeader[];
};

export class DataTreeOutputComponent extends AbstractOutputComponent<AbstractOutputProps, DataTreeOuputState> {
    treeRef: React.RefObject<HTMLDivElement> = React.createRef();

    constructor(props: AbstractOutputProps) {
        super(props);
        this.state = {
            outputStatus: ResponseStatus.RUNNING,
            selectedSeriesId: [],
            xyTree: [],
            collapsedNodes: [],
            orderedNodes: [],
            columns: [{title: 'Name', sortable: true}],
        };
    }

    componentDidMount(): void {
        this.waitAnalysisCompletion();
    }

    async fetchTree(): Promise<ResponseStatus> {
        const parameters = QueryHelper.timeQuery([this.props.range.getStart(), this.props.range.getEnd()]);
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
            }
            return treeResponse.status;
        }
        return ResponseStatus.FAILED;
    }

    renderTree(): React.ReactNode | undefined {
        this.onToggleCollapse = this.onToggleCollapse.bind(this);
        this.onOrderChange = this.onOrderChange.bind(this);
        return this.state.xyTree.length
            ? <div className='scrollable' style={{ height: this.props.style.height, width: this.getMainAreaWidth() }}>
                <EntryTree
                    entries={this.state.xyTree}
                    showCheckboxes={false}
                    collapsedNodes={this.state.collapsedNodes}
                    onToggleCollapse={this.onToggleCollapse}
                    onOrderChange={this.onOrderChange}
                    headers={this.state.columns}
                />
            </div>
            : undefined
            ;
    }
    renderMainArea(): React.ReactNode {
        return <React.Fragment>
            {this.state.outputStatus === ResponseStatus.COMPLETED ?
                <div ref={this.treeRef} className='output-component-tree'
                    style={{ height: this.props.style.height, width: this.props.widthWPBugWorkaround }}
                >
                    {this.renderTree()}
                </div> :
                <div className='analysis-running-main-area'>
                    <i className='fa fa-refresh fa-spin' style={{ marginRight: '5px' }} />
                    <span>Analysis running</span>
                </div>
            }
        </React.Fragment>;
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
    }
}
