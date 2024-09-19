import { injectable, inject } from '@theia/core/shared/inversify';
import { AbstractViewContribution } from '@theia/core/lib/browser/shell/view-contribution';
import { TraceExplorerWidget } from './trace-explorer-widget';
import { FrontendApplicationContribution, FrontendApplication } from '@theia/core/lib/browser';
import { MenuModelRegistry, CommandRegistry } from '@theia/core';
import { TraceExplorerCommands, TraceExplorerMenus } from './trace-explorer-commands';
import { NavigatorContextMenu } from '@theia/navigator/lib/browser/navigator-contribution';
import { UriAwareCommandHandler } from '@theia/core/lib/common/uri-command-handler';
import { SelectionService } from '@theia/core/lib/common';
import { TraceViewerContribution } from '../trace-viewer/trace-viewer-contribution';

@injectable()
export class TraceExplorerContribution
    extends AbstractViewContribution<TraceExplorerWidget>
    implements FrontendApplicationContribution
{
    @inject(SelectionService) protected readonly selectionService: SelectionService;
    @inject(TraceViewerContribution) protected readonly traceViewer: TraceViewerContribution;

    constructor() {
        super({
            widgetId: TraceExplorerWidget.ID,
            widgetName: TraceExplorerWidget.LABEL,
            defaultWidgetOptions: {
                area: 'left'
            },
            toggleCommandId: 'trace-explorer:toggle'
        });
    }

    async initializeLayout(_app: FrontendApplication): Promise<void> {
        await this.openView({ activate: false });
    }

    registerMenus(menus: MenuModelRegistry): void {
        super.registerMenus(menus);
        menus.registerMenuAction(TraceExplorerMenus.PREFERENCE_EDITOR_CONTEXT_MENU, {
            commandId: TraceExplorerCommands.OPEN_TRACE.id,
            label: 'Open Trace',
            order: 'a'
        });

        menus.registerMenuAction(TraceExplorerMenus.PREFERENCE_EDITOR_CONTEXT_MENU, {
            commandId: TraceExplorerCommands.CLOSE_TRACE.id,
            label: TraceExplorerCommands.CLOSE_TRACE.label,
            order: 'b'
        });

        menus.registerMenuAction(TraceExplorerMenus.PREFERENCE_EDITOR_CONTEXT_MENU, {
            commandId: TraceExplorerCommands.REMOVE_TRACE.id,
            label: TraceExplorerCommands.REMOVE_TRACE.label,
            order: 'c'
        });

        menus.registerMenuAction(NavigatorContextMenu.NAVIGATION, {
            commandId: TraceExplorerCommands.OPEN_IN_TRACE_VIEWER.id,
            order: 'z9'
        });
    }

    async registerCommands(registry: CommandRegistry): Promise<void> {
        super.registerCommands(registry);
        const explorerWidget = await this.widget;

        registry.registerCommand(TraceExplorerCommands.OPEN_TRACE, {
            execute: (traceUUID: string) => {
                explorerWidget.openExperiment(traceUUID);
            }
        });

        registry.registerCommand(TraceExplorerCommands.CLOSE_TRACE, {
            execute: (traceUUID: string) => {
                explorerWidget.closeExperiment(traceUUID);
            }
        });

        registry.registerCommand(TraceExplorerCommands.REMOVE_TRACE, {
            execute: (traceUUID: string) => {
                explorerWidget.deleteExperiment(traceUUID);
            }
        });

        registry.registerCommand(
            TraceExplorerCommands.OPEN_IN_TRACE_VIEWER,
            UriAwareCommandHandler.MonoSelect(this.selectionService, {
                execute: uri => {
                    this.traceViewer.open(uri);
                }
            })
        );
    }
}
