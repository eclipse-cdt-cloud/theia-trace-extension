import * as React from 'react';
import { List, ListRowProps, AutoSizer } from 'react-virtualized';
import { OutputAddedSignalPayload } from '@trace-viewer/base/lib/signals/output-added-signal-payload';
import { signalManager, Signals } from '@trace-viewer/base/lib/signals/signal-manager';
import { OutputDescriptor } from 'tsp-typescript-client/lib/models/output-descriptor';
import { Experiment } from 'tsp-typescript-client/lib/models/experiment';
import { AvailableViewsChangedSignalPayload } from '@trace-viewer/base/lib/signals/available-views-changed-signal-payload';
// import { ExperimentManager } from '@trace-viewer/base/src/experiment-manager';

export interface ReactAvailableViewsProps {
    id: string,
    title: string,
    // experimentManager: ExperimentManager,
    contextMenuRenderer?: (anchor: {x: number, y: number}, output: OutputDescriptor) => void,
}

export interface ReactAvailableViewsState {
    availableOutputDescriptors: OutputDescriptor[];
}

export class ReactAvailableViewsWidget extends React.Component<ReactAvailableViewsProps, ReactAvailableViewsState> {
    static LIST_MARGIN = 2;
    static LINE_HEIGHT = 16;
    static ROW_HEIGHT = (2 * ReactAvailableViewsWidget.LINE_HEIGHT) + ReactAvailableViewsWidget.LIST_MARGIN;

    protected forceUpdateKey = false;
    protected lastSelectedOutputIndex = -1;

    protected selectedExperiment: Experiment | undefined;

    protected onHandleAvailableViewsChanged = (payload: AvailableViewsChangedSignalPayload): void => this.doHandleAvailableViewsChanged(payload);

    constructor(props: ReactAvailableViewsProps) {
        super(props);
        signalManager().on(Signals.AVAILABLE_OUTPUTS_CHANGED, this.onHandleAvailableViewsChanged);
        this.state = { availableOutputDescriptors: [] };
    }

    componentWillUnmount(): void {
        signalManager().off(Signals.AVAILABLE_OUTPUTS_CHANGED, this.onHandleAvailableViewsChanged);
    }

    render(): React.ReactNode {
        this.forceUpdateKey = !this.forceUpdateKey;
        const key = Number(this.forceUpdateKey);
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
        if (props.index === this.lastSelectedOutputIndex) {
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
        this.lastSelectedOutputIndex = index;
        const outputs = this.state.availableOutputDescriptors;
        if (outputs && this.selectedExperiment) {
            signalManager().fireExperimentSelectedSignal(this.selectedExperiment);
            signalManager().fireOutputAddedSignal(new OutputAddedSignalPayload(outputs[index], this.selectedExperiment));
        }
    }

    protected doHandleContextMenuEvent(event: React.MouseEvent<HTMLDivElement>, output: OutputDescriptor | undefined): void {
        if (this.props.contextMenuRenderer && output) {
            this.props.contextMenuRenderer({ x: event.clientX, y: event.clientY }, output);
        }
        event.preventDefault();
        event.stopPropagation();
    }

    protected doHandleAvailableViewsChanged(payload: AvailableViewsChangedSignalPayload): void {
        this.setState({ availableOutputDescriptors: payload.getAvailableOutputDescriptors()} );
        this.selectedExperiment = payload.getExperiment();
    }
}
