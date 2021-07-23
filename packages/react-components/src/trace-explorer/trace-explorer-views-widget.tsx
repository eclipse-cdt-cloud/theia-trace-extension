import * as React from 'react';
import { List, ListRowProps, AutoSizer } from 'react-virtualized';
import { OutputAddedSignalPayload } from 'traceviewer-base/lib/signals/output-added-signal-payload';
import { signalManager, Signals } from 'traceviewer-base/lib/signals/signal-manager';
import { OutputDescriptor } from 'tsp-typescript-client/lib/models/output-descriptor';
import { Experiment } from 'tsp-typescript-client/lib/models/experiment';
import { ITspClientProvider } from 'traceviewer-base/lib/tsp-client-provider';
import { ExperimentManager } from 'traceviewer-base/lib/experiment-manager';

export interface ReactAvailableViewsProps {
    id: string,
    title: string,
    tspClientProvider: ITspClientProvider,
    contextMenuRenderer?: (event: React.MouseEvent<HTMLDivElement>, output: OutputDescriptor) => void,
}

export interface ReactAvailableViewsState {
    availableOutputDescriptors: OutputDescriptor[];
}

export class ReactAvailableViewsWidget extends React.Component<ReactAvailableViewsProps, ReactAvailableViewsState> {
    static LIST_MARGIN = 2;
    static LINE_HEIGHT = 16;
    static ROW_HEIGHT = (2 * ReactAvailableViewsWidget.LINE_HEIGHT) + ReactAvailableViewsWidget.LIST_MARGIN;

    private _forceUpdateKey = false;
    private _lastSelectedOutputIndex = -1;
    private _selectedExperiment: Experiment | undefined;
    private _experimentManager: ExperimentManager;

    protected doHandleExperimentSelectedSignal = (experiment: Experiment): void => this.doExperimentSelected(experiment);

    constructor(props: ReactAvailableViewsProps) {
        super(props);
        this._experimentManager = this.props.tspClientProvider.getExperimentManager();
        this.props.tspClientProvider.addTspClientChangeListener(() => {
            this._experimentManager = this.props.tspClientProvider.getExperimentManager();
        });
        signalManager().on(Signals.EXPERIMENT_SELECTED, this.doHandleExperimentSelectedSignal);
        this.state = { availableOutputDescriptors: [] };
    }

    componentWillUnmount(): void {
        signalManager().off(Signals.EXPERIMENT_SELECTED, this.doHandleExperimentSelectedSignal);
    }

    render(): React.ReactNode {
        this._forceUpdateKey = !this._forceUpdateKey;
        const key = Number(this._forceUpdateKey);
        let outputsRowCount = 0;
        const outputs = this.state.availableOutputDescriptors;
        if (outputs) {
            outputsRowCount = outputs.length;
        }
        const totalHeight = this.getTotalHeight();
        return (
            <div className='trace-explorer-views'>
                <div className='trace-explorer-panel-content'>
                    <AutoSizer>
                        {({ width }) =>
                            <List
                                key={key}
                                height={totalHeight}
                                width={width}
                                rowCount={outputsRowCount}
                                rowHeight={ReactAvailableViewsWidget.ROW_HEIGHT}
                                rowRenderer={this.renderRowOutputs}
                            />
                        }
                    </AutoSizer>
                </div>
            </div>
        );
    }

    protected renderRowOutputs = (props: ListRowProps): React.ReactNode => this.doRenderRowOutputs(props);

    private doRenderRowOutputs(props: ListRowProps): React.ReactNode {
        let outputName = '';
        let outputDescription = '';
        let output: OutputDescriptor | undefined;
        const outputDescriptors = this.state.availableOutputDescriptors;
        if (outputDescriptors && outputDescriptors.length && props.index < outputDescriptors.length) {
            output = outputDescriptors[props.index];
            outputName = output.name;
            outputDescription = output.description;
        }
        let traceContainerClassName = 'outputs-list-container';
        if (props.index === this._lastSelectedOutputIndex) {
            traceContainerClassName = traceContainerClassName + ' theia-mod-selected';
        }
        return <div className={traceContainerClassName}
            id={`${traceContainerClassName}-${props.index}`}
            key={props.key}
            style={props.style}
            onClick={this.handleOutputClicked}
            onContextMenu={event => { this.handleContextMenuEvent(event, output); }}
            data-id={`${props.index}`}
        >
            <h4 className='outputs-element-name'>
                {outputName}
            </h4>
            <div className='outputs-element-description child-element'>
                {outputDescription}
            </div>
        </div>;
    }

    protected getTotalHeight(): number {
        let totalHeight = 0;
        const outputDescriptors = this.state.availableOutputDescriptors;
        outputDescriptors?.forEach(() => totalHeight += ReactAvailableViewsWidget.ROW_HEIGHT);
        return totalHeight;
    }

    protected handleOutputClicked = (e: React.MouseEvent<HTMLDivElement>): void => this.doHandleOutputClicked(e);
    protected handleContextMenuEvent = (e: React.MouseEvent<HTMLDivElement>, output: OutputDescriptor | undefined): void => this.doHandleContextMenuEvent(e, output);

    private doHandleOutputClicked(e: React.MouseEvent<HTMLDivElement>) {
        const index = Number(e.currentTarget.getAttribute('data-id'));
        this._lastSelectedOutputIndex = index;
        const outputs = this.state.availableOutputDescriptors;
        if (outputs && this._selectedExperiment) {
            signalManager().fireExperimentSelectedSignal(this._selectedExperiment);
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

    protected doExperimentSelected(experiment: Experiment | undefined): void {
        this._selectedExperiment = experiment;
        this.updateAvailableViews();
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
        return outputDescriptors.filter(value => value.type !== 'DATA_TREE');
    }
}

