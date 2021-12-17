import { inject, injectable, postConstruct } from 'inversify';
import { ReactWidget } from '@theia/core/lib/browser';
import * as React from 'react';
import { CommandService } from '@theia/core';
import { OpenTraceCommand } from '../../trace-viewer/trace-viewer-commands';
import { PreferenceService } from '@theia/core/lib/browser';
import { TRACE_PATH, TRACE_PORT } from '../../trace-server-preference';

@injectable()
export class TraceExplorerPlaceholderWidget extends ReactWidget {
    static ID = 'trace-explorer-placeholder-widget';
    static LABEL = 'Trace Exploerer Placeholder Widget';
    protected path: string | undefined;
    protected port: number | undefined;

    state = {
        loading: false
    };

    private constructor() {
        super();
    }

    @inject(CommandService) protected readonly commandService!: CommandService;
    @inject(PreferenceService) protected readonly preferenceService: PreferenceService;

    @postConstruct()
    init(): void {
        this.preferenceService.onPreferenceChanged(event => {
            if (event.preferenceName === TRACE_PORT) {
                this.port = event.newValue;
            }
            if (event.preferenceName === TRACE_PATH) {
                this.path = event.newValue;
            }
        });

        this.path = this.preferenceService.get(TRACE_PATH);
        this.port = this.preferenceService.get(TRACE_PORT);

        this.id = TraceExplorerPlaceholderWidget.ID;
        this.title.label = TraceExplorerPlaceholderWidget.LABEL;
        this.update();
    }

    render(): React.ReactNode {
        const { loading } = this.state;
        return <div className='theia-navigator-container' tabIndex={0}>
            <div className='center'>{'You have not yet opened a trace.'}</div>
            <div className='open-workspace-button-container'>
                <button className='theia-button open-workspace-button' title='Select a trace to open'
                    onClick={this.handleOpenTrace} disabled={loading}>
                    {loading && (
                        <i
                            className='fa fa-refresh fa-spin'
                            style={{ marginRight: '5px' }}
                        />
                    )}
                    {loading && <span>Connecting to trace server</span>}
                    {!loading && <span>Open Trace</span>}
                </button>
            </div>
        </div>;
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
