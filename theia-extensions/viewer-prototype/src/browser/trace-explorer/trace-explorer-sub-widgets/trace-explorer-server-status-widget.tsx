import { inject, injectable, postConstruct } from 'inversify';
import { ReactWidget } from '@theia/core/lib/browser';
import * as React from 'react';
import { CommandService } from '@theia/core';

@injectable()
export class TraceExplorerServerStatusWidget extends ReactWidget {
    static ID = 'trace-explorer-server-status-widget';
    static LABEL = 'Trace Explorer Server Status Widget';

    private constructor() {
        super();
    }

    @inject(CommandService) protected readonly commandService!: CommandService;

    @postConstruct()
    init(): void {
        this.id = TraceExplorerServerStatusWidget.ID;
        this.title.label = TraceExplorerServerStatusWidget.LABEL;
        this.update();
    }

    render(): React.ReactNode {
        return (
            <div className="server-status-header">
                <span className="theia-header">Server Status </span>
                <i
                    id="server-status-id"
                    className="fa fa-times-circle-o fa-lg"
                    title="Trace Viewer Critical Error: Trace Server Offline"
                    style={{ color: 'red', marginLeft: '5px' }}
                />
            </div>
        );
    }
}
