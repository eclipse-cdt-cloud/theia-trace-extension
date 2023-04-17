import { inject, injectable, postConstruct } from 'inversify';
import { ReactWidget } from '@theia/core/lib/browser';
import * as React from 'react';
import { CommandService } from '@theia/core';
import { OpenTraceCommand } from '../../trace-viewer/trace-viewer-commands';
import {ReactExplorerPlaceholderWidget} from 'traceviewer-react-components/lib/trace-explorer/trace-explorer-placeholder-widget';

@injectable()
export class TraceExplorerPlaceholderWidget extends ReactWidget {
    static ID = 'trace-explorer-placeholder-widget';
    static LABEL = 'Trace Explorer Placeholder Widget';

    state = {
        loading: false
    };

    private constructor() {
        super();
    }

    @inject(CommandService) protected readonly commandService!: CommandService;

    @postConstruct()
    init(): void {
        this.id = TraceExplorerPlaceholderWidget.ID;
        this.title.label = TraceExplorerPlaceholderWidget.LABEL;
        this.update();
    }

    render(): React.ReactNode {
        const { loading } = this.state;
        return (
            <ReactExplorerPlaceholderWidget
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
}
