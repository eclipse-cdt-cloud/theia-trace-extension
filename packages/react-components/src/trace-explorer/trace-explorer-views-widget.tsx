import * as React from 'react';
import '../../style/output-components-style.css';
import { OutputAddedSignalPayload } from 'traceviewer-base/lib/signals/output-added-signal-payload';
import { signalManager, Signals } from 'traceviewer-base/lib/signals/signal-manager';
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
    /**
     * This is a placeholder for the customization implementation.
     * TODO - Make sure this comment an accurate reflection before PR.
     * @returns
     */
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

    private entryToTreeNode(entry: OutputDescriptor, idStringToNodeId: { [key: string]: number }): TreeNode {
        let id = idStringToNodeId[entry.id] ?? (idStringToNodeId[entry.id] = this._idGenerator++);

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
        const isCustomizable = entry.capabilities?.canCreate === true;
        const isDeletable = entry.capabilities?.canDelete === true;

        if (!isCustomizable && !isDeletable) {
            return undefined;
        }

        const nameSpanStyle = {
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            minWidth: 0,
            flexShrink: 1
        };

        if (isCustomizable) {
            return (): JSX.Element => (
                <>
                    <span style={nameSpanStyle}>{entry.name}</span>
                    <div className="remove-output-button-container" title={`Add custom analysis to ${entry.name}`}>
                        <button className="remove-output-button" onClick={e => this.handleCustomizeClick(entry, e)}>
                            <FontAwesomeIcon icon={faPlus} />
                        </button>
                    </div>
                </>
            );
        } else {
            // Must be deletable based on our conditions
            return (): JSX.Element => (
                <>
                    <span style={nameSpanStyle}>{entry.configuration?.name}</span>
                    <div className="remove-output-button-container" title={`Remove "${entry.configuration?.name}"`}>
                        <button className="remove-output-button" onClick={e => this.handleDeleteClick(entry, e)}>
                            <FontAwesomeIcon icon={faTimes} />
                        </button>
                    </div>
                </>
            );
        }
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
            console.dir(entry);
            const res = await this.props.tspClientProvider
                .getTspClient()
                .deleteDerivedOutput(this._selectedExperiment.UUID, entry.parentId as string, entry.id);
            if (!res.isOk()) {
                // request is failing for some reason...
                // But the output is removed when we update available views regardless
                console.error(`${res.getStatusCode()} - ${res.getStatusMessage()}`);
            }
            this.updateAvailableViews();
        }
    };
}
