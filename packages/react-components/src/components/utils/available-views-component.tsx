import { ListRowProps, AutoSizer, List } from 'react-virtualized';
import React from 'react';
import { OutputDescriptor } from 'tsp-typescript-client/lib/models/output-descriptor';
import { Experiment } from 'tsp-typescript-client/lib/models/experiment';
import { signalManager } from 'traceviewer-base/lib/signals/signal-manager';

export interface AvailableViewsComponentProps {
    traceID: string | undefined;
    outputDescriptors: OutputDescriptor[];
    onContextMenuEvent?: (
        event: React.MouseEvent<HTMLDivElement, MouseEvent>,
        output: OutputDescriptor | undefined
    ) => void;
    onOutputClicked: (selectedOutput: OutputDescriptor) => void;
    listRowWidth?: string;
    listRowPadding?: string;
    highlightAfterSelection?: boolean;
}

export interface AvailableViewsComponentState {
    lastSelectedOutputIndex: number;
}

export class AvailableViewsComponent extends React.Component<
    AvailableViewsComponentProps,
    AvailableViewsComponentState
> {
    static LIST_MARGIN = 2;
    static LINE_HEIGHT = 16;
    static ROW_HEIGHT = 2 * AvailableViewsComponent.LINE_HEIGHT + AvailableViewsComponent.LIST_MARGIN;

    private _forceUpdateKey = false;
    protected handleOutputClicked = (e: React.MouseEvent<HTMLDivElement>): void => this.doHandleOutputClicked(e);
    private _onExperimentSelected = (experiment?: Experiment): void =>
        this.doHandleExperimentSelectedSignal(experiment);

    constructor(props: AvailableViewsComponentProps) {
        super(props);
        signalManager().on('EXPERIMENT_SELECTED', this._onExperimentSelected);
        this.state = { lastSelectedOutputIndex: -1 };
    }

    componentWillUnmount(): void {
        signalManager().off('EXPERIMENT_SELECTED', this._onExperimentSelected);
    }

    render(): React.ReactNode {
        this._forceUpdateKey = !this._forceUpdateKey;
        const key = Number(this._forceUpdateKey);
        let outputsRowCount = 0;
        const outputs = this.props.outputDescriptors;
        if (outputs) {
            outputsRowCount = outputs.length;
        }
        const totalHeight = this.getTotalHeight();
        return (
            <div className="trace-explorer-panel-content disable-select" style={{ height: totalHeight }}>
                <AutoSizer>
                    {({ width }) => (
                        <List
                            key={key}
                            height={totalHeight}
                            width={width}
                            rowCount={outputsRowCount}
                            rowHeight={AvailableViewsComponent.ROW_HEIGHT}
                            rowRenderer={this.renderRowOutputs}
                        />
                    )}
                </AutoSizer>
            </div>
        );
    }

    protected renderRowOutputs = (props: ListRowProps): React.ReactNode => this.doRenderRowOutputs(props);

    private doRenderRowOutputs(props: ListRowProps): React.ReactNode {
        let outputName = '';
        let outputDescription = '';
        let output: OutputDescriptor | undefined;
        const outputDescriptors = this.props.outputDescriptors;
        if (outputDescriptors && outputDescriptors.length && props.index < outputDescriptors.length) {
            output = outputDescriptors[props.index];
            outputName = output.name;
            outputDescription = output.description;
        }
        let traceContainerClassName = 'outputs-list-container';
        if (this.props.highlightAfterSelection && props.index === this.state.lastSelectedOutputIndex) {
            traceContainerClassName = traceContainerClassName + ' theia-mod-selected';
        }

        if (this.props.listRowWidth) {
            props.style.width = this.props.listRowWidth;
        }

        if (this.props.listRowPadding) {
            props.style.paddingLeft = this.props.listRowPadding;
            props.style.paddingRight = this.props.listRowPadding;
        }

        return (
            <div
                className={traceContainerClassName}
                title={outputName + ':\n' + outputDescription}
                id={`${traceContainerClassName}-${props.index}`}
                key={props.key}
                style={props.style}
                onClick={this.handleOutputClicked}
                onContextMenu={event => {
                    this.doHandleContextMenuEvent(event, output);
                }}
                data-id={`${props.index}`}
            >
                <div style={{ width: '100%' }}>
                    <h4 className="outputs-element-name">{outputName}</h4>
                    <div className="outputs-element-description child-element">{outputDescription}</div>
                </div>
            </div>
        );
    }

    private doHandleContextMenuEvent(
        event: React.MouseEvent<HTMLDivElement, MouseEvent>,
        output: OutputDescriptor | undefined
    ) {
        if (this.props.onContextMenuEvent) {
            this.props.onContextMenuEvent(event, output);
        }
    }

    protected doHandleExperimentSelectedSignal(experiment: Experiment | undefined): void {
        if (this.props.traceID !== experiment?.UUID || this.props.outputDescriptors.length === 0) {
            this.setState({ lastSelectedOutputIndex: -1 });
        }
    }

    private doHandleOutputClicked(e: React.MouseEvent<HTMLDivElement>) {
        const index = Number(e.currentTarget.getAttribute('data-id'));
        this.setState({ lastSelectedOutputIndex: index });
        const selectedOutput = this.props.outputDescriptors[index];

        this.props.onOutputClicked(selectedOutput);
    }

    protected getTotalHeight(): number {
        let totalHeight = 0;
        const outputDescriptors = this.props.outputDescriptors;
        outputDescriptors?.forEach(() => (totalHeight += AvailableViewsComponent.ROW_HEIGHT));
        return totalHeight;
    }
}
