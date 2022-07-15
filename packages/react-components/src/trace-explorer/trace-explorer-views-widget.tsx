import * as React from 'react';
import { OutputAddedSignalPayload } from 'traceviewer-base/lib/signals/output-added-signal-payload';
import { signalManager, Signals } from 'traceviewer-base/lib/signals/signal-manager';
import { OutputDescriptor } from 'tsp-typescript-client/lib/models/output-descriptor';
import { Experiment } from 'tsp-typescript-client/lib/models/experiment';
import { ITspClientProvider } from 'traceviewer-base/lib/tsp-client-provider';
import { ExperimentManager } from 'traceviewer-base/lib/experiment-manager';
import { AvailableViewsComponent } from '../components/utils/available-views-component';

export interface ReactAvailableViewsProps {
    id: string,
    title: string,
    tspClientProvider: ITspClientProvider,
    contextMenuRenderer?: (event: React.MouseEvent<HTMLDivElement>, output: OutputDescriptor) => void,
}

export interface ReactAvailableViewsState {
    availableOutputDescriptors: OutputDescriptor[],
    lastSelectedOutputIndex: number;
}

export class ReactAvailableViewsWidget extends React.Component<ReactAvailableViewsProps, ReactAvailableViewsState> {
    private _forceUpdateKey = false;
    private _selectedExperiment: Experiment | undefined;
    private _experimentManager: ExperimentManager;

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
        this.state = { availableOutputDescriptors: [], lastSelectedOutputIndex: -1 };
    }

    componentWillUnmount(): void {
        signalManager().off(Signals.EXPERIMENT_SELECTED, this._onExperimentSelected);
        signalManager().off(Signals.EXPERIMENT_CLOSED, this._onExperimentClosed);
    }

    render(): React.ReactNode {
        this._forceUpdateKey = !this._forceUpdateKey;
        const key = Number(this._forceUpdateKey);
        return <AvailableViewsComponent availableViewListKey={key}
            outputDescriptors={this.state.availableOutputDescriptors}
            onContextMenuEvent={this.handleContextMenuEvent}
            onOutputClicked={this.handleOutputClicked}
            ></AvailableViewsComponent>;
    }

    protected handleOutputClicked = (e: React.MouseEvent<HTMLDivElement>): void => this.doHandleOutputClicked(e);
    protected handleContextMenuEvent = (e: React.MouseEvent<HTMLDivElement>, output: OutputDescriptor | undefined): void => this.doHandleContextMenuEvent(e, output);

    private doHandleOutputClicked(e: React.MouseEvent<HTMLDivElement>) {
        const index = Number(e.currentTarget.getAttribute('data-id'));
        this.setState({ lastSelectedOutputIndex: index });
        const outputs = this.state.availableOutputDescriptors;

        if (outputs && this._selectedExperiment) {
            signalManager().fireOutputAddedSignal(new OutputAddedSignalPayload(outputs[index], this._selectedExperiment));
        }
    }

    protected doHandleContextMenuEvent(event: React.MouseEvent<HTMLDivElement>, output: OutputDescriptor | undefined): void {
        if (this.props.contextMenuRenderer && output) {
            this.props.contextMenuRenderer(event, output);
        }
        event.preventDefault();
        event.stopPropagation();
    }

    protected doHandleExperimentSelectedSignal(experiment: Experiment | undefined): void {
        if ((this._selectedExperiment?.UUID !== experiment?.UUID) || this.state.availableOutputDescriptors.length === 0) {
            this._selectedExperiment = experiment;
            this.setState({ availableOutputDescriptors: [], lastSelectedOutputIndex: -1 });
            this.updateAvailableViews();
        }
    }

    protected doHandleExperimentClosedSignal(experiment: Experiment | undefined): void {
        if (this._selectedExperiment?.UUID === experiment?.UUID) {
            this.setState({availableOutputDescriptors: []});
        }
    }

    protected updateAvailableViews = async (): Promise<void> => this.doUpdateAvailableViews();

    protected async doUpdateAvailableViews(): Promise<void> {
        let outputs: OutputDescriptor[] | undefined;
        const signalExperiment: Experiment | undefined = this._selectedExperiment;
        if (signalExperiment) {
            outputs = await this.getOutputDescriptors(signalExperiment);
            this.setState({ availableOutputDescriptors: outputs });
        } else {
            this.setState({ availableOutputDescriptors: [] });
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
}
