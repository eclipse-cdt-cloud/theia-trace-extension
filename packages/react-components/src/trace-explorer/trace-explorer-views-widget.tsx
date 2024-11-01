import * as React from 'react';
import { OutputAddedSignalPayload } from 'traceviewer-base/lib/signals/output-added-signal-payload';
import { signalManager, Signals } from 'traceviewer-base/lib/signals/signal-manager';
import { OutputDescriptor, ProviderType } from 'tsp-typescript-client/lib/models/output-descriptor';
import { Experiment } from 'tsp-typescript-client/lib/models/experiment';
import { ITspClientProvider } from 'traceviewer-base/lib/tsp-client-provider';
import { ExperimentManager } from 'traceviewer-base/lib/experiment-manager';
import { FilterTree } from '../components/utils/filter-tree/tree';
import { TreeNode } from '../components/utils/filter-tree/tree-node';
import { getAllExpandedNodeIds } from '../components/utils/filter-tree/utils';

export interface ReactAvailableViewsProps {
    id: string;
    title: string;
    tspClientProvider: ITspClientProvider;
    contextMenuRenderer?: (event: React.MouseEvent<HTMLDivElement>, output: OutputDescriptor) => void;
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

    private _onExperimentSelected = (experiment: Experiment): void => this.doHandleExperimentSelectedSignal(experiment);
    private _onExperimentClosed = (experiment: Experiment): void => this.doHandleExperimentClosedSignal(experiment);

    constructor(props: ReactAvailableViewsProps) {
        super(props);
        this._experimentManager = this.props.tspClientProvider.getExperimentManager();
        this.props.tspClientProvider.addTspClientChangeListener(() => {
            this._experimentManager = this.props.tspClientProvider.getExperimentManager();
        });
        signalManager().on(Signals.EXPERIMENT_SELECTED, this._onExperimentSelected);
        signalManager().on(Signals.EXPERIMENT_CLOSED, this._onExperimentClosed);
        this._nodeIdToOutput = {};
        this.state = { treeNodes: [], collapsedNodes: [], orderedNodes: [], selectedOutput: -1 };
        this.onToggleCollapse = this.onToggleCollapse.bind(this);
        this.onOrderChange = this.onOrderChange.bind(this);
    }

    componentWillUnmount(): void {
        signalManager().off(Signals.EXPERIMENT_SELECTED, this._onExperimentSelected);
        signalManager().off(Signals.EXPERIMENT_CLOSED, this._onExperimentClosed);
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
                signalManager().fireOutputAddedSignal(
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
            const entries: TreeNode[] = [];
            outputs.forEach((output, index) => {
                const node: TreeNode = {
                    id: index,
                    parentId: -1,
                    labels: [output?.name],
                    tooltips: [output?.description],
                    children: [],
                    isRoot: true,
                    showTooltip: true
                };
                entries.push(node);
                this._nodeIdToOutput[index] = output;
            });
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
}
