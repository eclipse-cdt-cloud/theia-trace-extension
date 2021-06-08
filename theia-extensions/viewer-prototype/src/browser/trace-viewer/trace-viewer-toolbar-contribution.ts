import { injectable, inject } from 'inversify';
import { AbstractViewContribution, ApplicationShell, Widget } from '@theia/core/lib/browser';
import { TabBarToolbarContribution, TabBarToolbarRegistry } from '@theia/core/lib/browser/shell/tab-bar-toolbar';
import { CommandRegistry } from '@theia/core';
import { TraceViewerToolbarCommands } from './trace-viewer-toolbar-commands';
import { signalManager } from '@trace-viewer/base/lib/signals/signal-manager';
import { TraceViewerWidget } from './trace-viewer';

@injectable()
export class TraceViewerToolbarContribution extends AbstractViewContribution<Widget> implements TabBarToolbarContribution {
    @inject(ApplicationShell) protected readonly shell: ApplicationShell;

    constructor() {
        super({
            widgetId: TraceViewerWidget.ID,
            widgetName: TraceViewerWidget.LABEL,
            defaultWidgetOptions: {
                area: 'main',
            },
        });
    }

    initializeLayout(): void {
        this.openView({ activate: false });
    }

    registerCommands(registry: CommandRegistry): void {
        super.registerCommands(registry);
        registry.registerCommand(
            TraceViewerToolbarCommands.ZOOM_IN, {
            isVisible: (w: Widget) => w instanceof TraceViewerWidget,
            execute: () => {
                signalManager().fireZoomTimeGraphSignal(true);
            }
        });
        registry.registerCommand(
            TraceViewerToolbarCommands.ZOOM_OUT, {
            isVisible: (w: Widget) => w instanceof TraceViewerWidget,
            execute: () => {
                signalManager().fireZoomTimeGraphSignal(false);
            }
        });
        registry.registerCommand(
            TraceViewerToolbarCommands.RESET, {
            isVisible: (w: Widget) => w instanceof TraceViewerWidget,
            execute: () => {
                signalManager().fireResetTimeGraphSignal();
            }
        });
    }

    registerToolbarItems(registry: TabBarToolbarRegistry): void {
        registry.registerItem({
            id: TraceViewerToolbarCommands.ZOOM_IN.id,
            command: TraceViewerToolbarCommands.ZOOM_IN.id,
            tooltip: TraceViewerToolbarCommands.ZOOM_IN.label,
            priority: 1,
        });
        registry.registerItem({
            id: TraceViewerToolbarCommands.ZOOM_OUT.id,
            command: TraceViewerToolbarCommands.ZOOM_OUT.id,
            tooltip: TraceViewerToolbarCommands.ZOOM_OUT.label,
            priority: 2,
        });
        registry.registerItem({
            id: TraceViewerToolbarCommands.RESET.id,
            command: TraceViewerToolbarCommands.RESET.id,
            tooltip: TraceViewerToolbarCommands.RESET.label,
            priority: 3,
        });
    }
}
