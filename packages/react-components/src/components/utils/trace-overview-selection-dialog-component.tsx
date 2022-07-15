import {  DialogProps } from '@theia/core/lib/browser/dialogs';
import React from 'react';
import { OutputDescriptor } from 'tsp-typescript-client/lib/models/output-descriptor';
import { Message } from '@theia/core/lib/browser/widgets';
import { ReactDialog } from '@theia/core/lib/browser/dialogs/react-dialog';
import { AvailableViewsComponent } from './available-views-component';

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
        return <AvailableViewsComponent
            availableViewListKey={key}
            onOutputClicked={e => {this.doHandleOutputClicked(e);}}
            outputDescriptors={this.outputDescriptors}
        ></AvailableViewsComponent>;
    }

    private doHandleOutputClicked(e: React.MouseEvent<HTMLDivElement>) {
        const index = Number(e.currentTarget.getAttribute('data-id'));
        this.selectedOutput = this.outputDescriptors[index];
        this.accept();
    }

    protected getTotalHeight(): number {
        let totalHeight = 0;
        const outputDescriptors = this.outputDescriptors;
        outputDescriptors?.forEach(() => totalHeight += AvailableViewsComponent.ROW_HEIGHT);
        return totalHeight;
    }
}
