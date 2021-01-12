import { inject, injectable, postConstruct } from 'inversify';
import { ReactWidget } from '@theia/core/lib/browser';
import * as React from 'react';
import { CommandService } from '@theia/core';
import { OpenTraceCommand } from '../../trace-viewer/trace-viewer-commands';

@injectable()
export class TraceExplorerPlaceholderWidget extends ReactWidget {
    static ID = 'trace-explorer-placeholder-widget';
    static LABEL = 'Trace Exploerer Placeholder Widget';

    @inject(CommandService) protected readonly commandService!: CommandService;

    @postConstruct()
    init(): void {
        this.id = TraceExplorerPlaceholderWidget.ID;
        this.title.label = TraceExplorerPlaceholderWidget.LABEL;
        this.update();
    }

    render(): React.ReactNode {
        return <div className='theia-navigator-container' tabIndex={0}>
            <div className='center'>{'You have not yet opened a trace.'}</div>
            <div className='open-workspace-button-container'>
                <button className='theia-button open-workspace-button' title='Select a trace to open'
                    onClick={this.handleOpenTrace}>{'Open Trace'}</button>
            </div>
        </div>;
    }

    protected handleOpenTrace = async (): Promise<void> => this.doHandleOpenTrace();

    private async doHandleOpenTrace() {
        this.commandService.executeCommand(OpenTraceCommand.id);
    }
}
