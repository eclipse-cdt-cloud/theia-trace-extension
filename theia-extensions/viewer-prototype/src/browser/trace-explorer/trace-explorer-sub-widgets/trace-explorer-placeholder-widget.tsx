import { inject, injectable, postConstruct } from 'inversify';
import { ReactWidget } from '@theia/core/lib/browser';
import * as React from 'react';
import { CommandService } from '@theia/core';
import { OpenTraceCommand } from '../../trace-viewer/trace-viewer-commands';
import { PortBusy, TraceServerConfigService } from '../../../common/trace-server-config';
import { PreferenceService } from '@theia/core/lib/browser';
import { TRACE_PATH, TRACE_PORT } from '../../trace-server-preference';
import { TspClient } from 'tsp-typescript-client/lib/protocol/tsp-client';
import { TspClientProvider } from '../../tsp-client-provider-impl';
import { TspClientResponse } from 'tsp-typescript-client/lib/protocol/tsp-client-response';
import { HealthStatus } from 'tsp-typescript-client/lib/models/health';
import { MessageService } from '@theia/core';

@injectable()
export class TraceExplorerPlaceholderWidget extends ReactWidget {
    static ID = 'trace-explorer-placeholder-widget';
    static LABEL = 'Trace Exploerer Placeholder Widget';
    protected path: string | undefined;
    protected port: number | undefined;
    private tspClient: TspClient;

    state = {
        loading: false
    };

    private constructor(
        @inject(TspClientProvider) private tspClientProvider: TspClientProvider
    ) {
        super();
        this.tspClient = this.tspClientProvider.getTspClient();
        this.tspClientProvider.addTspClientChangeListener(tspClient => this.tspClient = tspClient);
    }

    @inject(CommandService) protected readonly commandService!: CommandService;
    @inject(PreferenceService) protected readonly preferenceService: PreferenceService;
    @inject(TraceServerConfigService) protected readonly traceServerConfigService: TraceServerConfigService;
    @inject(MessageService) protected readonly messageService: MessageService;

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
        try {
            this.state.loading = true;
            this.update();
            const healthResponse = await this.tspClient.checkHealth();
            if ((healthResponse as TspClientResponse<HealthStatus>).getModel()?.status === 'UP') {
                this.state.loading = false;
                this.update();
                this.commandService.executeCommand(OpenTraceCommand.id);
            }
        }
        catch (e) {
            this.messageService.showProgress({
                text: ''
            }).then(async progress => {
                progress.report({ message: 'Launching trace server... ', work: { done: 10, total: 100 } });
                try {
                    const resolve = await this.traceServerConfigService.startTraceServer(this.path, this.port);
                    if (resolve === 'success') {
                        progress.report({ message: `Trace server started on port: ${this.port}.`, work: { done: 100, total: 100 } });
                        progress.cancel();
                        this.commandService.executeCommand(OpenTraceCommand.id);
                    }
                }
                catch (err) {
                    if (PortBusy.is(err)) {
                        this.messageService.error(
                            `Error opening serial port ${this.port}. (Port busy)`);
                    } else {
                        this.messageService.error(
                            'Failed to start the trace server: no such file or directory. Please make sure that the path is correct in Trace Viewer settings and retry');
                    }
                    progress.cancel();
                }
                this.state.loading = false;
                this.update();
            });
        }
    }

}
