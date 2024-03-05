import { inject, injectable, postConstruct } from '@theia/core/shared/inversify';
import { ReactWidget } from '@theia/core/lib/browser';
import * as React from 'react';
import { CommandService } from '@theia/core';

@injectable()
export class TraceExplorerServerStatusWidget extends ReactWidget {
    static ID = 'trace-explorer-server-status-widget';
    static LABEL = 'Trace Explorer Server Status Widget';
    private serverOn = false;

    @inject(CommandService) protected readonly commandService!: CommandService;

    @postConstruct()
    protected init(): void {
        this.id = TraceExplorerServerStatusWidget.ID;
        this.title.label = TraceExplorerServerStatusWidget.LABEL;
        this.update();
    }

    public updateStatus = (status: boolean): void => {
        this.serverOn = status;
        this.update();
    };

    render(): React.ReactNode {
        const className = this.serverOn ? 'fa fa-check-circle-o fa-lg' : 'fa fa-times-circle-o fa-lg';
        const title = this.serverOn
            ? 'Server health and latency are good. No known issues'
            : 'Trace Viewer Critical Error: Trace Server Offline';
        const color = this.serverOn ? 'green' : 'red';

        return (
            <div className="server-status-header">
                <span className="theia-header">Server Status </span>
                <i id="server-status-id" className={className} title={title} style={{ color, marginLeft: '5px' }} />
            </div>
        );
    }
}
