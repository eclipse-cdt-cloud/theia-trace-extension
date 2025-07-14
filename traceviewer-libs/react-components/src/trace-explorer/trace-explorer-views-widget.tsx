import * as React from 'react';
import '../../style/output-components-style.css';
import { OutputAddedSignalPayload } from 'traceviewer-base/lib/signals/output-added-signal-payload';
import { signalManager } from 'traceviewer-base/lib/signals/signal-manager';
import { OutputDescriptor, ProviderType } from 'tsp-typescript-client/lib/models/output-descriptor';
import { Experiment } from 'tsp-typescript-client/lib/models/experiment';
import { ITspClientProvider } from 'traceviewer-base/lib/tsp-client-provider';
import { ExperimentManager } from 'traceviewer-base/lib/experiment-manager';
import { FilterTree } from '../components/utils/filter-tree/tree';
import { TreeNode } from '../components/utils/filter-tree/tree-node';
import { getAllExpandedNodeIds } from '../components/utils/filter-tree/utils';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faTimes } from '@fortawesome/free-solid-svg-icons';

export interface ReactAvailableViewsProps {
    id: string;
    title: string;
    tspClientProvider: ITspClientProvider;
    contextMenuRenderer?: (event: React.MouseEvent<HTMLDivElement>, output: OutputDescriptor) => void;
    onCustomizationClick?: (entry: OutputDescriptor, experiment: Experiment) => void;
}

export interface ReactAvailableViewsState {
    treeNodes: TreeNode[];
    collapsedNodes: number[];
    orderedNodes: number[];
    selectedOutput: number;
}

export class ReactAvailableViewsWidget extends React.Component<ReactAvailableViewsProps, ReactAvailableViewsState> {
    private _selectedExperiment: Experiment | undefined;
    private _experimentManager: ExperimentManager;

    private _nodeIdToOutput: { [key: number]: OutputDescriptor } = {};
    private _idGenerator = 0;

    private _onExperimentSelected = (experiment?: Experiment): void =>
        this.doHandleExperimentSelectedSignal(experiment);
    private _onExperimentClosed = (experiment: Experiment): void => this.doHandleExperimentClosedSignal(experiment);

    constructor(props: ReactAvailableViewsProps) {
        super(props);
        this._experimentManager = this.props.tspClientProvider.getExperimentManager();
        this.props.tspClientProvider.addTspClientChangeListener(() => {
            this._experimentManager = this.props.tspClientProvider.getExperimentManager();
        });
        signalManager().on('EXPERIMENT_SELECTED', this._onExperimentSelected);
        signalManager().on('EXPERIMENT_CLOSED', this._onExperimentClosed);
        this._nodeIdToOutput = {};
        this.state = { treeNodes: [], collapsedNodes: [], orderedNodes: [], selectedOutput: -1 };
        this.onToggleCollapse = this.onToggleCollapse.bind(this);
        this.onOrderChange = this.onOrderChange.bind(this);
    }

    componentWillUnmount(): void {
        signalManager().off('EXPERIMENT_SELECTED', this._onExperimentSelected);
        signalManager().off('EXPERIMENT_CLOSED', this._onExperimentClosed);
    }

    render(): React.ReactNode {
        return (
            <div className="trace-explorer-views">
                <div className="trace-explorer-panel-content">{this.renderOutputs()}</div>
            </div>
        );
    }

    private renderOutputs() {
        if (this.state.treeNodes) {
            return (
                <FilterTree
                    collapsedNodes={this.state.collapsedNodes}
                    className="table-tree avail-views-table"
                    nodes={this.state.treeNodes}
                    onToggleCollapse={this.onToggleCollapse}
                    onOrderChange={this.onOrderChange}
                    selectedRow={this.state.selectedOutput}
                    showCheckboxes={false}
                    showFilter={true}
                    showHeader={true}
                    hideFillers={true}
                    onRowClick={id => {
                        this.handleOutputClicked(id);
                    }}
                    onContextMenu={this.handleContextMenuEvent}
                    headers={[{ title: 'Name', sortable: true, resizable: true }]}
                />
            );
        }
        return <></>;
    }
    protected handleOutputClicked = (id: number): void => this.doHandleOutputClicked(id);
    protected handleContextMenuEvent = (e: React.MouseEvent<HTMLDivElement>, id: number | undefined): void =>
        this.doHandleContextMenuEvent(e, id);

    private doHandleOutputClicked(id: number) {
        const selectedOutput: OutputDescriptor = this._nodeIdToOutput[id];
        this.setState({ selectedOutput: id });
        if (selectedOutput && this._selectedExperiment) {
            if (selectedOutput.type !== ProviderType.NONE) {
                signalManager().emit(
                    'OUTPUT_ADDED',
                    new OutputAddedSignalPayload(selectedOutput, this._selectedExperiment)
                );
            }
        }
    }

    protected doHandleContextMenuEvent(event: React.MouseEvent<HTMLDivElement>, id: number | undefined): void {
        if (id !== undefined) {
            const output: OutputDescriptor = this._nodeIdToOutput[id];
            if (this.props.contextMenuRenderer && output) {
                this.props.contextMenuRenderer(event, output);
            }
        }
        event.preventDefault();
        event.stopPropagation();
    }

    protected doHandleExperimentSelectedSignal(experiment: Experiment | undefined): void {
        if (this._selectedExperiment?.UUID !== experiment?.UUID || this.state.treeNodes.length === 0) {
            this._selectedExperiment = experiment;
            this._nodeIdToOutput = {};
            this.setState({ treeNodes: [] });
            this.updateAvailableViews();
        }
    }

    protected doHandleExperimentClosedSignal(experiment: Experiment | undefined): void {
        if (this._selectedExperiment?.UUID === experiment?.UUID) {
            this._nodeIdToOutput = {};
            this.setState({ treeNodes: [] });
        }
    }

    protected updateAvailableViews = async (): Promise<void> => this.doUpdateAvailableViews();

    protected async doUpdateAvailableViews(): Promise<void> {
        let outputs: OutputDescriptor[] | undefined;
        const signalExperiment: Experiment | undefined = this._selectedExperiment;
        if (signalExperiment) {
            outputs = await this.getOutputDescriptors(signalExperiment);
            const entries: TreeNode[] = this.listToTree(outputs);
            this.setState({ treeNodes: entries });
        } else {
            this._nodeIdToOutput = {};
            this.setState({ treeNodes: [] });
        }
    }

    protected async getOutputDescriptors(experiment: Experiment): Promise<OutputDescriptor[]> {
        const outputDescriptors: OutputDescriptor[] = [];
        const descriptors = await this._experimentManager.getAvailableOutputs(experiment.UUID);
        if (descriptors && descriptors.length) {
            outputDescriptors.push(...descriptors);
        }

        return outputDescriptors;
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

    private onOrderChange(ids: number[]): void {
        this.setState({ orderedNodes: ids });
    }

    private listToTree(list: OutputDescriptor[]): TreeNode[] {
        const rootNodes: TreeNode[] = [];
        const lookup: { [key: string]: TreeNode } = {};
        const idStringToNodeId: { [key: string]: number } = {};

        // By default, when customization is not supported,
        // replace useless root "configurator" nodes with their
        // children, if any.
        list = this.filterList(list);
        // Fill-in the lookup table
        list.forEach((output, index) => {
            const node: TreeNode = this.entryToTreeNode(output, idStringToNodeId);
            node.elementIndex = index;
            lookup[output.id] = node;
            this._nodeIdToOutput[node.id] = output;
        });
        // Create the tree in the order it has been received
        list.forEach(output => {
            const node = lookup[output.id];
            if (output.parentId !== undefined) {
                const parent: TreeNode = lookup[output.parentId];
                if (parent) {
                    if (parent.id !== node.id) {
                        parent.children.push(node);
                    }
                } else {
                    // no parent available, treat is as root node
                    node.isRoot = true;
                    rootNodes.push(node);
                }
            } else {
                node.isRoot = true;
                rootNodes.push(node);
            }
        });
        return rootNodes;
    }

    private filterList(list: OutputDescriptor[]): OutputDescriptor[] {
        return this.doFilterList(list);
    }

    /**
     * Overridable function that permits to remove output descriptors for the list obtained from
     * the trace server. The default implementation removes "configurator" nodes when customization
     * is not possible. The code that processes the list afterward to create nodes from them, will
     * promote children of removed nodes to root nodes, when the parent is not found.
     * @param list list of output descriptors
     * @returns filtered list
     */
    protected doFilterList(list: OutputDescriptor[]): OutputDescriptor[] {
        if (!this.isCustomizationSupported()) {
            return list.filter(output => !this.isOutputCustomizable(output));
        }
        return list;
    }

    private entryToTreeNode(entry: OutputDescriptor, idStringToNodeId: { [key: string]: number }): TreeNode {
        const id = idStringToNodeId[entry.id] ?? (idStringToNodeId[entry.id] = this._idGenerator++);

        let parentId = -1;
        if (entry.parentId) {
            parentId = idStringToNodeId[entry.parentId] ?? (idStringToNodeId[entry.parentId] = this._idGenerator++);
        }

        const treeNode: TreeNode = {
            labels: [entry.name],
            tooltips: entry.description ? [entry.description] : undefined,
            showTooltip: true,
            isRoot: false,
            id,
            parentId,
            children: [],
            getEnrichedContent: this.createEnrichedContent(entry)
        };

        return treeNode;
    }

    private createEnrichedContent(entry: OutputDescriptor): (() => JSX.Element) | undefined {
        // Return undefined if no relevant capabilities or if customization is not supported
        if ((!this.isOutputCustomizable(entry) && !this.isOutputDeletable(entry)) || !this.isCustomizationSupported()) {
            return undefined;
        }

        const nameSpanStyle = {
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            minWidth: 0,
            flexShrink: 1
        };

        const useCustomizableUI = this.isOutputCustomizable(entry);

        const EnrichedContent = (): JSX.Element => {
            const displayName = useCustomizableUI ? entry.name : entry.configuration?.name;

            const buttonTitle = useCustomizableUI ? 'Add custom view...' : `Remove "${displayName}"`;

            const icon = useCustomizableUI ? faPlus : faTimes;

            const handleClick = useCustomizableUI
                ? (e: React.MouseEvent) => this.handleCustomizeClick(entry, e)
                : (e: React.MouseEvent) => this.handleDeleteClick(entry, e);

            return (
                <>
                    <span style={nameSpanStyle}>{displayName}</span>
                    <div className={'enriched-output-button-container'} title={buttonTitle}>
                        <button className={'enriched-output-button'} onClick={handleClick}>
                            <FontAwesomeIcon icon={icon} />
                        </button>
                    </div>
                </>
            );
        };

        return EnrichedContent;
    }

    private handleCustomizeClick = async (entry: OutputDescriptor, e: React.MouseEvent) => {
        e.stopPropagation();
        if (this.props.onCustomizationClick && this._selectedExperiment) {
            await this.props.onCustomizationClick(entry, this._selectedExperiment);
            this.updateAvailableViews();
        }
    };

    private handleDeleteClick = async (entry: OutputDescriptor, e: React.MouseEvent) => {
        e.stopPropagation();
        if (this._selectedExperiment?.UUID) {
            const res = await this.props.tspClientProvider
                .getTspClient()
                .deleteDerivedOutput(this._selectedExperiment.UUID, entry.parentId as string, entry.id);
            if (!res.isOk()) {
                console.error(`${res.getStatusCode()} - ${res.getStatusMessage()}`);
            }
            this.updateAvailableViews();
        }
    };

    private isOutputCustomizable(od: OutputDescriptor): boolean {
        return !!od.capabilities?.canCreate;
    }

    private isOutputDeletable(od: OutputDescriptor): boolean {
        return !!od.capabilities?.canDelete;
    }

    private isCustomizationSupported(): boolean {
        // If the app using this library has not provided a callback to create
        // customized views, we can consider customizing views is not supported
        return !!this.props.onCustomizationClick;
    }
}
