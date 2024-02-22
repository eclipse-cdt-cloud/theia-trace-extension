import { inject, injectable, postConstruct } from '@theia/core/shared/inversify';
import { ReactWidget } from '@theia/core/lib/browser';
import * as React from 'react';
import { CommandService } from '@theia/core';
import { OpenTraceFileCommand, OpenTraceFolderCommand } from '../../trace-viewer/trace-viewer-commands';
import {
    ReactExplorerPlaceholderWidget,
    TraceResourceType
} from 'traceviewer-react-components/lib/trace-explorer/trace-explorer-placeholder-widget';

@injectable()
export class TraceExplorerPlaceholderWidget extends ReactWidget {
    static ID = 'trace-explorer-placeholder-widget';
    static LABEL = 'Trace Explorer Placeholder Widget';

    state = {
        loading: false
    };

    @inject(CommandService) protected readonly commandService!: CommandService;

    @postConstruct()
    protected init(): void {
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

    protected handleOpenTrace = async (type?: TraceResourceType): Promise<void> => this.doHandleOpenTrace(type);

    private async doHandleOpenTrace(type?: TraceResourceType) {
        this.state.loading = true;
        this.update();
        if (type && type === TraceResourceType.FILE) {
            await this.commandService.executeCommand(OpenTraceFileCommand.id);
        } else {
            await this.commandService.executeCommand(OpenTraceFolderCommand.id);
        }
        this.state.loading = false;
        this.update();
    }
}
