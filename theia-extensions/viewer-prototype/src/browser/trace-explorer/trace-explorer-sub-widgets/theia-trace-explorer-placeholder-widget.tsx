import { inject, injectable, postConstruct } from '@theia/core/shared/inversify';
import { ReactWidget } from '@theia/core/lib/browser';
import * as React from 'react';
import { CommandService } from '@theia/core';
import { OpenTraceCommand, StartServerCommand } from '../../trace-viewer/trace-viewer-commands';
import { ReactExplorerPlaceholderWidget } from 'traceviewer-react-components/lib/trace-explorer/trace-explorer-placeholder-widget';
import { TraceServerConnectionStatusClient } from '../../../common/trace-server-connection-status';

@injectable()
export class TraceExplorerPlaceholderWidget extends ReactWidget {
    static ID = 'trace-explorer-placeholder-widget';
    static LABEL = 'Trace Explorer Placeholder Widget';

    state = {
        loading: false,
        serverStatus: false,
        tracesOpened: false
    };

    @inject(CommandService) protected readonly commandService!: CommandService;
    @inject(TraceServerConnectionStatusClient)
    protected traceServerConnectionStatusProxy: TraceServerConnectionStatusClient;

    @postConstruct()
    protected init(): void {
        this.id = TraceExplorerPlaceholderWidget.ID;
        this.title.label = TraceExplorerPlaceholderWidget.LABEL;
        this.update();
    }

    dispose(): void {
        super.dispose();
    }

    render(): React.ReactNode {
        const { loading, serverStatus, tracesOpened } = this.state;
        return (
            <ReactExplorerPlaceholderWidget
                tracesOpen={tracesOpened}
                serverOn={serverStatus}
                handleStartServer={this.handleStartServer}
                loading={loading}
                handleOpenTrace={this.handleOpenTrace}
            ></ReactExplorerPlaceholderWidget>
        );
    }

    protected handleOpenTrace = async (): Promise<void> => this.doHandleOpenTrace();

    private async doHandleOpenTrace() {
        this.state.loading = true;
        this.update();
        await this.commandService.executeCommand(OpenTraceCommand.id);
        this.state.loading = false;
        this.update();
    }

    protected handleStartServer = async (): Promise<void> => this.doHandleStartServer();

    private async doHandleStartServer() {
        this.state.loading = true;
        this.update();
        await this.commandService.executeCommand(StartServerCommand.id);
        this.state.loading = false;
        this.update();
    }

    public setStateAndShow(newState: { serverStatus: boolean; tracesOpened: boolean }): void {
        this.state = { ...this.state, ...newState };
        this.show();
        this.update();
    }
}
