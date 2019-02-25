import { injectable, inject } from "inversify";
import { ReactWidget } from "@theia/core/lib/browser/widgets/react-widget";
import { TraceManager } from "../../common/trace-manager";
import { Trace } from "tsp-typescript-client/lib/models/trace";
import * as React from 'react';
import { AgGridReact } from 'ag-grid-react';

export const TRACE_PROPERTIES_ID = 'trace-properties';
export const TRACE_PROPERTIES_LABEL = 'Trace Properties';

@injectable()
export class TracePropertiesWidget extends ReactWidget {
    private traceInfo: Array<any> = new Array();
    private activeTrace: Trace | undefined;

    constructor(
        @inject(TraceManager) private traceManager: TraceManager,
    ) {
        super();
        this.id = TRACE_PROPERTIES_ID;
        this.title.label = TRACE_PROPERTIES_LABEL;
        this.toDispose.push(traceManager.traceOpenedSignal(trace => this.onTraceOpened(trace)));
        this.toDispose.push(traceManager.traceClosedSignal(trace => this.onTraceClosed(trace)));
    }

    async initialize(): Promise<void> {
        // Wrong but works for now
        const traces = await this.traceManager.getOpenTraces();
        if (traces.length) {
            this.activeTrace = traces[0];
            this.updateTraceInfo();
        }
    }

    private onTraceOpened(openedTrace: Trace) {
        this.activeTrace = openedTrace;
        this.traceInfo = this.traceToGridLines(openedTrace);
        this.updateTraceInfo();
    }

    private onTraceClosed(closedTrace: Trace) {
        this.activeTrace = undefined;
        this.traceInfo = new Array();
        this.update();
    }

    protected render(): React.ReactNode {
        return <div className='trace-properties-container'>
            {this.renderTraceInfo()}
        </div>;
    }

    protected renderTraceInfo(): React.ReactNode {
        if (this.activeTrace) {
            return <div className='ag-theme-balham-dark' style={{ height: '250px' }}>
                <AgGridReact
                    enableColResize={true}
                    columnDefs={[{ headerName: 'Property', field: 'property', width: 130 }, { headerName: 'Value', field: 'value', width: 500 }]}
                    rowData={this.traceInfo}>
                </AgGridReact>
            </div>;
        } else {
            return <div style={{color: 'white'}}>
                {'Open a trace first'}
            </div>
        }
    }

    private async updateTraceInfo() {
        if (this.activeTrace) {
            const updatedTrace = await this.traceManager.updateTrace(this.activeTrace.name);
            if (updatedTrace) {
                this.activeTrace = updatedTrace;
                this.traceInfo = this.traceToGridLines(updatedTrace);
                this.update();

                if (updatedTrace.indexingStatus === 'RUNNING') {
                    setTimeout(() => this.updateTraceInfo(), 1000);
                }
            }
        }
    }

    private traceToGridLines(trace: Trace): Array<any> {
        return [{ property: 'Name', value: trace.name },
        { property: 'UUID', value: trace.UUID },
        { property: 'Path', value: trace.path },
        { property: 'Start time', value: trace.start },
        { property: 'End time', value: trace.end },
        { property: 'Nb of Events', value: trace.nbEvents },
        { property: 'Indexing Status', value: trace.indexingStatus }];
    }
}