import { ListRowProps, AutoSizer, List } from 'react-virtualized';
import {  DialogProps } from '@theia/core/lib/browser/dialogs';
import React from 'react';
import { OutputDescriptor } from 'tsp-typescript-client/lib/models/output-descriptor';
import { Message } from '@theia/core/lib/browser/widgets';
import { ReactDialog } from '@theia/core/lib/browser/dialogs/react-dialog';

export class TraceOverviewSelectionDialog{
    static async showOpenDialog(outputDescriptors: OutputDescriptor[]): Promise<OutputDescriptor | undefined> {
        const dialogProps: DialogProps = {
            title: 'Select overview source'
        };
        const dialog = new TraceOverviewSelectionDialogComponent(dialogProps, outputDescriptors);
        const returnedValue = await dialog.open();

        return returnedValue;
    }
}

class TraceOverviewSelectionDialogComponent extends ReactDialog<OutputDescriptor | undefined>{

    static ID = 'trace-overview-selection-dialog';
    static LABEL = 'Available Views';
    static LIST_MARGIN = 2;
    static LINE_HEIGHT = 16;
    static ROW_HEIGHT = (2 * TraceOverviewSelectionDialogComponent.LINE_HEIGHT) + TraceOverviewSelectionDialogComponent.LIST_MARGIN;

    private outputDescriptors: OutputDescriptor[];
    private selectedOutput: OutputDescriptor | undefined;

    protected handleOutputClicked = (e: React.MouseEvent<HTMLDivElement>): void => this.doHandleOutputClicked(e);

    constructor(props: DialogProps, output: OutputDescriptor[]){
        super(props);
        this.outputDescriptors = output;
        this.appendCloseButton('Cancel');
    }

    protected override onCloseRequest(msg: Message): void {
        super.onCloseRequest(msg);
        this.accept();
    }

    get value(): OutputDescriptor | undefined {
        return this.selectedOutput;
    }

    render(): React.ReactNode{
        const key = Number(true);
        let outputsRowCount = 0;
        if (this.outputDescriptors) {
            outputsRowCount = this.outputDescriptors.length;
        }
        const totalHeight = this.getTotalHeight();

        return (
            <div style={{ height: (totalHeight + 'px') }}>
                <AutoSizer>
                    {({ width }) =>
                        <List
                            key={key}
                            height={totalHeight}
                            width={width}
                            rowCount={outputsRowCount}
                            rowHeight={TraceOverviewSelectionDialogComponent.ROW_HEIGHT}
                            rowRenderer={this.renderRowOutputs}
                        />
                    }
                </AutoSizer>
            </div>
        );
    }

    protected renderRowOutputs = (props: ListRowProps): React.ReactNode => this.doRenderRowOutputs(props);

    private doRenderRowOutputs(props: ListRowProps): React.ReactNode {
        let outputName = '';
        let outputDescription = '';
        let output: OutputDescriptor | undefined;
        const outputDescriptors = this.outputDescriptors;
        if (outputDescriptors && outputDescriptors.length && props.index < outputDescriptors.length) {
            output = outputDescriptors[props.index];
            outputName = output.name;
            outputDescription = output.description;
        }
        const traceContainerClassName = 'outputs-list-container';
        return <div
            className={traceContainerClassName}
            title={outputName + ':\n' + outputDescription}
            id={`${traceContainerClassName}-${props.index}`}
            key={props.key}
            onClick={this.handleOutputClicked}
            style={{cursor: 'pointer'}}
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

    private doHandleOutputClicked(e: React.MouseEvent<HTMLDivElement>) {
        const index = Number(e.currentTarget.getAttribute('data-id'));
        this.selectedOutput = this.outputDescriptors[index];
        this.accept();
    }

    protected getTotalHeight(): number {
        let totalHeight = 0;
        const outputDescriptors = this.outputDescriptors;
        outputDescriptors?.forEach(() => totalHeight += TraceOverviewSelectionDialogComponent.ROW_HEIGHT);
        return totalHeight;
    }
}
