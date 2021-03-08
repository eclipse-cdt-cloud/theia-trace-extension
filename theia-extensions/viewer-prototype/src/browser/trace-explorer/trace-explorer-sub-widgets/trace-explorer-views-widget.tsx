import { inject, injectable, postConstruct } from 'inversify';
import { ReactWidget, Widget, Message } from '@theia/core/lib/browser';
import * as React from 'react';
import { List, ListRowProps, AutoSizer } from 'react-virtualized';
import { OutputAddedSignalPayload } from '@trace-viewer/base/lib/signals/output-added-signal-payload';
import { signalManager, Signals } from '@trace-viewer/base/lib/signals/signal-manager';
import { OutputDescriptor } from 'tsp-typescript-client/lib/models/output-descriptor';
import { TspClientProvider } from '../../tsp-client-provider-impl';
import { Experiment } from 'tsp-typescript-client/lib/models/experiment';
import { AvailableAnalysesChangedSignalPayload } from '@trace-viewer/base/lib/signals/available-analyses-changed-signal-payload';

@injectable()
export class TraceExplorerViewsWidget extends ReactWidget {
    static ID = 'trace-explorer-views-widget';
    static LABEL = 'Available Views';
    static LIST_MARGIN = 2;
    static LINE_HEIGHT = 16;
    static ROW_HEIGHT = (2 * TraceExplorerViewsWidget.LINE_HEIGHT) + TraceExplorerViewsWidget.LIST_MARGIN;

    @inject(TspClientProvider) protected readonly tspClientProvider!: TspClientProvider;
    protected forceUpdateKey = false;
    protected lastSelectedOutputIndex = -1;

    protected selectedExperiment: Experiment | undefined;
    protected availableOutputDescriptors: OutputDescriptor[] | undefined;

    private onAvailableAnalysesChanged = (payload: AvailableAnalysesChangedSignalPayload): void => this.doHandleAvailableAnalysesChangedSignal(payload);

    @postConstruct()
    init(): void {
        this.id = TraceExplorerViewsWidget.ID;
        this.title.label = TraceExplorerViewsWidget.LABEL;
        signalManager().on(Signals.AVAILABLE_OUTPUTS_CHANGED, this.onAvailableAnalysesChanged);
        this.update();
    }

    dispose(): void {
        super.dispose();
        signalManager().off(Signals.AVAILABLE_OUTPUTS_CHANGED, this.onAvailableAnalysesChanged);
    }

    render(): React.ReactNode {
        this.forceUpdateKey = !this.forceUpdateKey;
        const key = Number(this.forceUpdateKey);
        let outputsRowCount = 0;
        const outputs = this.availableOutputDescriptors;
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
                                rowHeight={TraceExplorerViewsWidget.ROW_HEIGHT}
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
        const outputDescriptors = this.availableOutputDescriptors;
        if (outputDescriptors && outputDescriptors.length && props.index < outputDescriptors.length) {
            outputName = outputDescriptors[props.index].name;
            outputDescription = outputDescriptors[props.index].description;
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
        const outputDescriptors = this.availableOutputDescriptors;
        outputDescriptors?.forEach(() => totalHeight += TraceExplorerViewsWidget.ROW_HEIGHT);
        return totalHeight;
    }

    protected handleOutputClicked = (e: React.MouseEvent<HTMLDivElement>): void => this.doHandleOutputClicked(e);

    private doHandleOutputClicked(e: React.MouseEvent<HTMLDivElement>) {
        const index = Number(e.currentTarget.getAttribute('data-id'));
        this.lastSelectedOutputIndex = index;
        const outputs = this.availableOutputDescriptors;
        if (outputs && this.selectedExperiment) {
            signalManager().fireExperimentSelectedSignal(this.selectedExperiment);
            signalManager().fireOutputAddedSignal(new OutputAddedSignalPayload(outputs[index], this.selectedExperiment));
        }
        this.update();
    }

    protected onResize(msg: Widget.ResizeMessage): void {
        super.onResize(msg);
        this.update();
    }

    protected onAfterShow(msg: Message): void {
        super.onAfterShow(msg);
        this.update();
    }

    protected doHandleAvailableAnalysesChangedSignal(payload: AvailableAnalysesChangedSignalPayload): void {
        this.availableOutputDescriptors = payload.getAvailableOutputDescriptors();
        this.selectedExperiment = payload.getExperiment();
        this.update();
    }
}
