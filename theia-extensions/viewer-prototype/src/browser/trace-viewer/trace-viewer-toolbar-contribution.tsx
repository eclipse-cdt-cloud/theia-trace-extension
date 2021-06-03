import { injectable, inject } from 'inversify';
import * as React from 'react';
import { AbstractViewContribution, ApplicationShell, Widget } from '@theia/core/lib/browser';
import { TabBarToolbarContribution, TabBarToolbarRegistry } from '@theia/core/lib/browser/shell/tab-bar-toolbar';
import { CommandRegistry, DisposableCollection, Emitter, MenuModelRegistry } from '@theia/core';
import { TraceViewerToolbarCommands, TraceViewerToolbarFilterMenus, TRACE_VIEWER_TOOLBAR_COMMAND_FILTER } from './trace-viewer-toolbar-commands';
import { signalManager, Signals } from '@trace-viewer/base/lib/signals/signal-manager';
import { TraceViewerWidget } from './trace-viewer';
import { TspClientProvider } from '../tsp-client-provider-impl';
import { ContextMenuRenderer } from '@theia/core/lib/browser';

@injectable()
export class TraceViewerToolbarContribution extends AbstractViewContribution<Widget> implements TabBarToolbarContribution {
    @inject(ApplicationShell) protected readonly shell: ApplicationShell;
    @inject(ContextMenuRenderer) protected readonly contextMenuRenderer!: ContextMenuRenderer;
    @inject(TspClientProvider) protected readonly tspClientProvider!: TspClientProvider;
    @inject(MenuModelRegistry)
    protected readonly menus: MenuModelRegistry;

    @inject(CommandRegistry)
    protected readonly commands: CommandRegistry;
    private annotationsMap: Map<string, boolean> = new Map<string, boolean>();
    private onAnnotationsFetchedSignal = (annotationsList: string[]) => this.doHandleAnnotationsFetchedSignal(annotationsList);
    protected readonly onAnnotationsChangedEmitter = new Emitter<void>();
    protected readonly onAnnotationsChangedEvent = this.onAnnotationsChangedEmitter.event;

    constructor() {
        super({
            widgetId: TraceViewerWidget.ID,
            widgetName: TraceViewerWidget.LABEL,
            defaultWidgetOptions: {
                area: 'main',
            },
        });
        signalManager().on(Signals.ANNOTATIONS_FETCHED, this.onAnnotationsFetchedSignal);
    }

    initializeLayout(): void {
        this.openView({ activate: false });
    }

    private doHandleAnnotationsFetchedSignal(annotationsList: string[]) {
        annotationsList.forEach(annotation => {
            if (!this.annotationsMap.has(annotation)) {
                this.annotationsMap.set(annotation, true);
            }
        });
        this.onAnnotationsChangedEmitter.fire();
        signalManager().fireAnnotationFilterSignal(Array.from(this.annotationsMap.entries()).filter(category => category[1]).map(category => category[0]));
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
            id: TRACE_VIEWER_TOOLBAR_COMMAND_FILTER.id,
            isVisible: w => w instanceof TraceViewerWidget && this.annotationsMap.size > 0,
            // render() here is not a react component and hence need to disable the react display-name rule
            // eslint-disable-next-line react/display-name
            render: () => <div className="item enabled">
                <div id="trace.viewer.toolbar.filter" className="fa fa-filter" title="Markers filter" onClick={async (event: React.MouseEvent) => {
                    const toDisposeOnHide = new DisposableCollection();
                    const menuPath = TraceViewerToolbarFilterMenus.TOOLBAR_FILTER_MARKERS_MENU;
                    let index = 0;
                    this.annotationsMap.forEach((toggleInd, categoryName, self) => {
                        index += 1;
                        toDisposeOnHide.push(this.menus.registerMenuAction(menuPath, {
                            label: categoryName,
                            commandId: categoryName.toString() + index.toString(),
                            order: index.toString(),
                        }));

                        toDisposeOnHide.push(this.commands.registerCommand({
                            id: categoryName.toString() + index.toString(),
                            label: categoryName
                        }, {
                            execute: () => {
                                self.set(categoryName, !self.get(categoryName));
                                signalManager().fireAnnotationFilterSignal(Array.from(this.annotationsMap.entries()).filter(category => category[1]).map(category => category[0]));
                            },
                            isToggled: () => !!self.get(categoryName),

                        }));
                    });

                    return this.contextMenuRenderer.render({
                        menuPath,
                        args: [],
                        anchor: { x: event.clientX, y: event.clientY },
                        onHide: () => setTimeout(() => toDisposeOnHide.dispose())
                    });
                }}></div>
            </div>,
            priority: 1,
            group: 'navigation',
            onDidChange: this.onAnnotationsChangedEvent,
        });

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

