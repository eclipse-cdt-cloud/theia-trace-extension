import { inject, injectable, postConstruct } from 'inversify';
import { ReactWidget, Widget } from '@theia/core/lib/browser';
import * as React from 'react';
import { Experiment } from 'tsp-typescript-client/lib/models/experiment';
import { ExperimentManager } from '@trace-viewer/base/lib/experiment-manager';
import { CommandService } from '@theia/core';
import { TspClientProvider } from '../../tsp-client-provider-impl';
import { signalManager} from '@trace-viewer/base/lib/signals/signal-manager';
import { TraceExplorerTooltipWidget } from './trace-explorer-tooltip-widget';
import { ContextMenuRenderer } from '@theia/core/lib/browser';
import { TraceViewerCommand } from '../../trace-viewer/trace-viewer-commands';
import { ReactOpenTracesWidget} from '@trace-viewer/react-components/lib/trace-explorer/trace-explorer-opened-traces-widget';
import { TraceExplorerMenus } from '../trace-explorer-commands';

@injectable()
export class TraceExplorerOpenedTracesWidget extends ReactWidget {
    static ID = 'trace-explorer-opened-traces-widget';
    static LABEL = 'Opened Traces';
    static LIST_MARGIN = 2;
    static LINE_HEIGHT = 16;

    @inject(TspClientProvider) protected readonly tspClientProvider!: TspClientProvider;
    @inject(TraceExplorerTooltipWidget) protected readonly tooltipWidget!: TraceExplorerTooltipWidget;
    @inject(ContextMenuRenderer) protected readonly contextMenuRenderer!: ContextMenuRenderer;
    @inject(CommandService) protected readonly commandService!: CommandService;

    private _experimentManager!: ExperimentManager;

    @postConstruct()
    async init(): Promise<void> {
        this.id = TraceExplorerOpenedTracesWidget.ID;
        this.title.label = TraceExplorerOpenedTracesWidget.LABEL;
        this._experimentManager = this.tspClientProvider.getExperimentManager();
        this.tspClientProvider.addTspClientChangeListener(() => {
            this._experimentManager = this.tspClientProvider.getExperimentManager();
        });
        this.update();
    }

    protected doHandleContextMenuEvent(event: React.MouseEvent<HTMLDivElement>, experiment: Experiment): void {
        this.contextMenuRenderer.render({
            menuPath: TraceExplorerMenus.PREFERENCE_EDITOR_CONTEXT_MENU,
            anchor: { x: event.clientX, y: event.clientY },
            args: [experiment.UUID]
        });
    }

    protected doHandleClickEvent(event: React.MouseEvent<HTMLDivElement>, experiment: Experiment): void {
        this.openExperiment(experiment.UUID);
    }

    public openExperiment(traceUUID: string): void {
        this.commandService.executeCommand(TraceViewerCommand.id, { traceUUID });
    }

    public closeExperiment(traceUUID: string): void {
        signalManager().fireCloseTraceViewerTabSignal(traceUUID);
    }

    public deleteExperiment(traceUUID: string): void {
        this._experimentManager.closeExperiment(traceUUID);
        this.closeExperiment(traceUUID);
    }

    render(): React.ReactNode {
        return (<div>
            { <ReactOpenTracesWidget
                id={this.id}
                title={this.title.label}
                tspClientProvider={this.tspClientProvider}
                contextMenuRenderer={(event, experiment) => this.doHandleContextMenuEvent(event, experiment) }
                onClick={(event, experiment) => this.doHandleClickEvent(event, experiment) }
            ></ReactOpenTracesWidget>
            }
        </div>);
    }

    protected onResize(msg: Widget.ResizeMessage): void {
        super.onResize(msg);
        this.update();
    }
}
