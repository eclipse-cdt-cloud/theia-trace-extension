import { Path } from '@theia/core';
import { Message, StatusBar } from '@theia/core/lib/browser';
import { ReactWidget } from '@theia/core/lib/browser/widgets/react-widget';
import { inject, injectable } from 'inversify';
import * as React from 'react';
import { OutputDescriptor } from 'tsp-typescript-client/lib/models/output-descriptor';
import { Trace } from 'tsp-typescript-client/lib/models/trace';
import { TspClient } from 'tsp-typescript-client/lib/protocol/tsp-client';
import { TraceManager } from '../../common/trace-manager';
import { OutputAddedSignalPayload, TraceExplorerWidget } from '../trace-explorer/trace-explorer-widget';
import { TraceContextComponent } from './components/trace-context-component';

export const TraceViewerWidgetOptions = Symbol('TraceViewerWidgetOptions');
export interface TraceViewerWidgetOptions {
    traceURI: string;
}

@injectable()
export class TraceViewerWidget extends ReactWidget {
    static ID = 'trace-viewer';
    static LABEL = 'Trace Viewer';

    protected readonly uri: Path;
    private openedTrace: Trace | undefined;
    private outputDescriptors: OutputDescriptor[] = [];

    private resizeHandlers: (() => void)[] = [];
    private readonly addResizeHandler = (h: () => void) => {
        this.resizeHandlers.push(h);
    }

    constructor(
        @inject(TraceViewerWidgetOptions) protected readonly options: TraceViewerWidgetOptions,
        @inject(TraceManager) private traceManager: TraceManager,
        @inject(TspClient) private tspClient: TspClient,
        @inject(StatusBar) private statusBar: StatusBar
    ) {
        super();
        this.uri = new Path(this.options.traceURI);
        this.id = 'theia-traceOpen';
        this.title.label = 'Trace: ' + this.uri.base;
        this.title.closable = true;
        this.addClass('theia-trace-open');
        this.toDispose.push(TraceExplorerWidget.outputAddedSignal(output => this.onOutputAdded(output)));
        this.initialize();
    }

    async initialize(): Promise<void> {
        const trace = await this.traceManager.openTrace(this.uri, this.uri.name);
        if (trace) {
            this.openedTrace = trace;
        }
        this.update();
    }

    onCloseRequest(msg: Message) {
        if (this.openedTrace) {
            this.traceManager.closeTrace(this.openedTrace.UUID);
        }
        this.statusBar.removeElement('time-selection-range');
        super.onCloseRequest(msg);
    }

    protected onResize() {
        this.resizeHandlers.forEach(h => h());
    }

    protected render(): React.ReactNode {
        this.onOutputRemoved = this.onOutputRemoved.bind(this);
        return <div className='trace-viewer-container'>
            {this.openedTrace ? <TraceContextComponent trace={this.openedTrace}
                tspClient={this.tspClient}
                outputs={this.outputDescriptors}
                onOutputRemove={this.onOutputRemoved}
                statusBar={this.statusBar}
                addResizeHandler={this.addResizeHandler} /> : 'Trace is loading...'}
        </div>;
    }

    private onOutputAdded(payload: OutputAddedSignalPayload) {
        if (this.openedTrace && payload.getTrace().UUID === this.openedTrace.UUID) {
            const exist = this.outputDescriptors.find(output => { return output.id === payload.getOutputDescriptor().id });
            if (!exist) {
                this.outputDescriptors.push(payload.getOutputDescriptor());
                this.update();
            }
        }
    }

    private onOutputRemoved(outputId: string) {
        const outputToKeep = this.outputDescriptors.filter(output => {
            return output.id !== outputId;
        });
        this.outputDescriptors = outputToKeep;
        this.update();
    }
}
