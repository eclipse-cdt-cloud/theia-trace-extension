import { inject, injectable, postConstruct } from '@theia/core/shared/inversify';
import { ReactWidget, Widget, WidgetManager } from '@theia/core/lib/browser';
import * as React from 'react';
import { Experiment } from 'tsp-typescript-client/lib/models/experiment';
import { ExperimentManager } from 'traceviewer-base/lib/experiment-manager';
import { CommandService } from '@theia/core';
import { TspClientProvider } from '../../tsp-client-provider-impl';
import { signalManager } from 'traceviewer-base/lib/signals/signal-manager';
import { TraceExplorerItemPropertiesWidget } from './theia-trace-explorer-properties-widget';
import { ContextMenuRenderer } from '@theia/core/lib/browser';
import { TraceViewerCommand } from '../../trace-viewer/trace-viewer-commands';
import { ReactOpenTracesWidget } from 'traceviewer-react-components/lib/trace-explorer/trace-explorer-opened-traces-widget';
import { TraceExplorerMenus } from '../trace-explorer-commands';
import { TraceViewerWidget } from '../../trace-viewer/trace-viewer';

@injectable()
export class TraceExplorerOpenedTracesWidget extends ReactWidget {
    static ID = 'trace-explorer-opened-traces-widget';
    static LABEL = 'Opened Traces';
    static LIST_MARGIN = 2;
    static LINE_HEIGHT = 16;

    @inject(TspClientProvider) protected readonly tspClientProvider!: TspClientProvider;
    @inject(TraceExplorerItemPropertiesWidget)
    protected readonly itemPropertiesWidget!: TraceExplorerItemPropertiesWidget;
    @inject(ContextMenuRenderer) protected readonly contextMenuRenderer!: ContextMenuRenderer;
    @inject(CommandService) protected readonly commandService!: CommandService;
    @inject(WidgetManager) protected readonly widgetManager!: WidgetManager;

    private _experimentManager!: ExperimentManager;

    @postConstruct()
    protected init(): void {
        this.doInit();
    }

    protected async doInit(): Promise<void> {
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
        const widgets = this.widgetManager.getWidgets(TraceViewerWidget.ID);
        const widget = widgets.find(w => w.id === traceUUID);
        // Don't execute command if widget is already open.
        if (!widget) {
            this.commandService.executeCommand(TraceViewerCommand.id, { traceUUID });
        }
    }

    public closeExperiment(traceUUID: string): void {
        signalManager().emit('CLOSE_TRACEVIEWERTAB', traceUUID);
    }

    public deleteExperiment(traceUUID: string): void {
        this._experimentManager.deleteExperiment(traceUUID);
        this.closeExperiment(traceUUID);
    }

    render(): React.ReactNode {
        return (
            <div>
                <ReactOpenTracesWidget
                    id={this.id}
                    title={this.title.label}
                    tspClientProvider={this.tspClientProvider}
                    contextMenuRenderer={(event, experiment) => this.doHandleContextMenuEvent(event, experiment)}
                    onClick={(event, experiment) => this.doHandleClickEvent(event, experiment)}
                ></ReactOpenTracesWidget>
            </div>
        );
    }

    protected onResize(msg: Widget.ResizeMessage): void {
        super.onResize(msg);
        this.update();
    }
}
