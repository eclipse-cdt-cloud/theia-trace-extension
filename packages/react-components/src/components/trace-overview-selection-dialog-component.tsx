import React from 'react';
import { OutputDescriptor, ITspClient } from 'tsp-typescript-client';
import { AbstractDialogComponent, DialogComponentProps } from './abstract-dialog-component';
import { signalManager } from 'traceviewer-base/lib/signals/signal-manager';
import { AvailableViewsComponent } from './utils/available-views-component';

export interface TraceOverviewSelectionComponentProps extends DialogComponentProps {
    tspClient: ITspClient;
    traceID: string;
}

export interface TraceOverviewSelectionComponentState {
    outputDescriptors: OutputDescriptor[];
}

export class TraceOverviewSelectionDialogComponent extends AbstractDialogComponent<
    TraceOverviewSelectionComponentProps,
    TraceOverviewSelectionComponentState
> {
    private selectedOutput: OutputDescriptor | undefined;
    protected handleOutputClicked = (selectedOutput: OutputDescriptor): void =>
        this.doHandleOutputClicked(selectedOutput);

    constructor(props: TraceOverviewSelectionComponentProps) {
        super(props);
        this.state = {
            outputDescriptors: []
        };

        this.getAvailableOutputDescriptors();
    }

    protected renderDialogBody(): React.ReactElement {
        if (!this.state.outputDescriptors) {
            return <div>Loading available outputs...</div>;
        }
        return (
            <div id="trace-overview-selection-dialog-content-container">
                <AvailableViewsComponent
                    traceID={this.props.traceID}
                    onOutputClicked={e => {
                        this.doHandleOutputClicked(e);
                    }}
                    outputDescriptors={this.state.outputDescriptors}
                    listRowWidth="95%"
                    listRowPadding="10px"
                ></AvailableViewsComponent>
            </div>
        );
    }

    protected renderFooter(): React.ReactElement {
        return (
            <button className="theia-button secondary" onClick={this.props.onCloseDialog}>
                Close
            </button>
        );
    }

    private async getAvailableOutputDescriptors() {
        if (this.props.traceID) {
            const result = await this.props.tspClient.experimentOutputs(this.props.traceID);
            const descriptors = result.getModel();
            const overviewOutputDescriptors = descriptors?.filter(output => output.type === 'TREE_TIME_XY');
            if (overviewOutputDescriptors) {
                this.setState({
                    outputDescriptors: overviewOutputDescriptors
                });
            }
        }
    }

    private doHandleOutputClicked(selectedOutput: OutputDescriptor) {
        signalManager().emit('OVERVIEW_OUTPUT_SELECTED', this.props.traceID, selectedOutput);
        this.props.onCloseDialog();
    }
}
