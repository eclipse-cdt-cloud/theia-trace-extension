import { inject, injectable, postConstruct } from 'inversify';
import { ReactWidget, Widget, Message } from '@theia/core/lib/browser';
import * as React from 'react';
import { List, ListRowProps, AutoSizer } from 'react-virtualized';
import { TraceExplorerOpenedTracesWidget } from './trace-explorer-opened-traces-widget';
import { Emitter } from '@theia/core';
import { OutputAddedSignalPayload } from '../output-added-signal-payload';

@injectable()
export class TraceExplorerAnalysisWidget extends ReactWidget {
    static ID = 'trace-explorer-analysis-widget';
    static LABEL = 'Available Analysis';
    static LIST_MARGIN = 2;
    static LINE_HEIGHT = 16;
    static ROW_HEIGHT = (2 * TraceExplorerAnalysisWidget.LINE_HEIGHT) + TraceExplorerAnalysisWidget.LIST_MARGIN;

    protected forceUpdateKey = false;

    protected outputAddedEmitter = new Emitter<OutputAddedSignalPayload>();
    outputAddedSignal = this.outputAddedEmitter.event;

    @inject(TraceExplorerOpenedTracesWidget) protected readonly openedTracesWidget!: TraceExplorerOpenedTracesWidget;

    @postConstruct()
    init(): void {
        this.id = TraceExplorerAnalysisWidget.ID;
        this.title.label = TraceExplorerAnalysisWidget.LABEL;
        this.toDispose.push(this.openedTracesWidget.availableOutputDescriptorsDidChange(() => {
            this.update();
        }));
        this.toDispose.push(this.outputAddedEmitter);
        this.update();
    }

    render(): React.ReactNode {
        this.forceUpdateKey = !this.forceUpdateKey;
        const key = Number(this.forceUpdateKey);
        const { openedExperiments, availableOutputDescriptors, selectedExperimentIndex } = this.openedTracesWidget;
        let outputsRowCount = 0;
        const outputs = availableOutputDescriptors.get(openedExperiments[selectedExperimentIndex]?.UUID);
        if (outputs) {
            outputsRowCount = outputs.length;
        }
        const totalHeight = this.getTotalHeight();
        return (
            <div className='trace-explorer-analysis'>
                <div className='trace-explorer-panel-content'>
                    <AutoSizer>
                        {({ width }) =>
                            <List
                                key={key}
                                height={totalHeight}
                                width={width}
                                rowCount={outputsRowCount}
                                rowHeight={TraceExplorerAnalysisWidget.ROW_HEIGHT}
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
        const { openedExperiments, availableOutputDescriptors, selectedExperimentIndex, lastSelectedOutputIndex } = this.openedTracesWidget;
        const selectedTrace = openedExperiments[selectedExperimentIndex];
        if (selectedTrace) {
            const outputDescriptors = availableOutputDescriptors.get(selectedTrace.UUID);
            if (outputDescriptors && outputDescriptors.length && props.index < outputDescriptors.length) {
                outputName = outputDescriptors[props.index].name;
                outputDescription = outputDescriptors[props.index].description;
            }
        }
        let traceContainerClassName = 'outputs-list-container';
        if (props.index === lastSelectedOutputIndex) {
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
        const { openedExperiments, availableOutputDescriptors, selectedExperimentIndex } = this.openedTracesWidget;
        const selectedTrace = openedExperiments[selectedExperimentIndex];
        if (selectedTrace) {
            const outputDescriptors = availableOutputDescriptors.get(selectedTrace.UUID);
            outputDescriptors?.forEach(() => totalHeight += TraceExplorerAnalysisWidget.ROW_HEIGHT);
        }
        return totalHeight;
    }

    protected handleOutputClicked = (e: React.MouseEvent<HTMLDivElement>): void => this.doHandleOutputClicked(e);

    private doHandleOutputClicked(e: React.MouseEvent<HTMLDivElement>) {
        const index = Number(e.currentTarget.getAttribute('data-id'));
        const { openedExperiments, selectedExperimentIndex, availableOutputDescriptors } = this.openedTracesWidget;
        this.openedTracesWidget.lastSelectedOutputIndex = index;
        const trace = openedExperiments[selectedExperimentIndex];
        const outputs = availableOutputDescriptors.get(trace.UUID);
        if (outputs) {
            this.outputAddedEmitter.fire(new OutputAddedSignalPayload(outputs[index], trace));
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
}
