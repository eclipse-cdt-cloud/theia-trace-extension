import { Path } from '@theia/core';
import { Message, StatusBar } from '@theia/core/lib/browser';
import { ReactWidget } from '@theia/core/lib/browser/widgets/react-widget';
import { inject, injectable } from 'inversify';
import * as React from 'react';
import { Provider } from 'react-redux';
import { createStore } from 'redux';
import { Trace } from 'tsp-typescript-client/lib/models/trace';
import { TspClient } from 'tsp-typescript-client/lib/protocol/tsp-client';
import { TraceManager } from '../../common/trace-manager';
import { TraceContextComponent } from './components/trace-context-component';
import { traceReducer } from './redux/reducers/trace-reducer';
import { TraceExplorerWidget } from '../trace-explorer/trace-explorer-widget';
import { OutputDescriptor } from 'tsp-typescript-client/lib/models/output-descriptor';

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

    private store = createStore(traceReducer)

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
        // TODO Handle resizing
    }

    protected render(): React.ReactNode {
        this.onOutputRemoved = this.onOutputRemoved.bind(this);
        return <Provider store={this.store}>
            <div className='trace-viewer-container'>
                {this.openedTrace ? <TraceContextComponent trace={this.openedTrace}
                    tspClient={this.tspClient}
                    outputs={this.outputDescriptors}
                    onOutputRemove={this.onOutputRemoved}
                    statusBar={this.statusBar} /> : 'Trace is loading...'}
            </div>
        </Provider>;
    }

    private onOutputAdded(outputDescriptor: OutputDescriptor) {
        const exist = this.outputDescriptors.find(output => { return output.id === outputDescriptor.id });
        if (!exist) {
            this.outputDescriptors.push(outputDescriptor);
            this.update();
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
