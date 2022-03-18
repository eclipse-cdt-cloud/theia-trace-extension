import { CommandContribution, CommandRegistry, DisposableCollection, Emitter, MenuModelRegistry } from '@theia/core';
import { ApplicationShell, ContextMenuRenderer, Widget } from '@theia/core/lib/browser';
import { TabBarToolbarContribution, TabBarToolbarRegistry } from '@theia/core/lib/browser/shell/tab-bar-toolbar';
import { inject, injectable, postConstruct } from 'inversify';
import * as React from 'react';
import { signalManager, Signals } from 'traceviewer-base/lib/signals/signal-manager';
import { TraceExplorerOpenedTracesWidget } from '../trace-explorer/trace-explorer-sub-widgets/theia-trace-explorer-opened-traces-widget';
import { ChartShortcutsDialog } from '../trace-explorer/trace-explorer-sub-widgets/trace-explorer-keyboard-shortcuts/charts-cheatsheet-component';
import { TspClientProvider } from '../tsp-client-provider-impl';
import { TraceViewerWidget } from './trace-viewer';
import { OpenTraceCommand } from './trace-viewer-commands';
import { TraceViewerToolbarCommands, TraceViewerToolbarMenus } from './trace-viewer-toolbar-commands';

@injectable()
export class TraceViewerToolbarContribution implements TabBarToolbarContribution, CommandContribution {
    @inject(ApplicationShell) protected readonly shell: ApplicationShell;
    @inject(ContextMenuRenderer) protected readonly contextMenuRenderer!: ContextMenuRenderer;
    @inject(TspClientProvider) protected readonly tspClientProvider!: TspClientProvider;
    @inject(MenuModelRegistry) protected readonly menus: MenuModelRegistry;
    @inject(CommandRegistry) protected readonly commands: CommandRegistry;
    @inject(ChartShortcutsDialog) protected readonly chartShortcuts: ChartShortcutsDialog;

    private onMarkerCategoriesFetchedSignal = () => this.doHandleMarkerCategoriesFetchedSignal();
    private onMarkerSetsFetchedSignal = () => this.doHandleMarkerSetsFetchedSignal();

    protected readonly onMarkerCategoriesChangedEmitter = new Emitter<void>();
    protected readonly onMarkerCategoriesChangedEvent = this.onMarkerCategoriesChangedEmitter.event;
    protected readonly onMakerSetsChangedEmitter = new Emitter<void>();
    protected readonly onMakerSetsChangedEvent = this.onMakerSetsChangedEmitter.event;

    @postConstruct()
    protected init(): void {
        signalManager().on(Signals.MARKER_CATEGORIES_FETCHED, this.onMarkerCategoriesFetchedSignal);
        signalManager().on(Signals.MARKERSETS_FETCHED, this.onMarkerSetsFetchedSignal);
    }

    private doHandleMarkerCategoriesFetchedSignal() {
        this.onMarkerCategoriesChangedEmitter.fire();
    }

    private doHandleMarkerSetsFetchedSignal() {
        this.onMakerSetsChangedEmitter.fire();
    }

    registerCommands(registry: CommandRegistry): void {
        registry.registerCommand(
            TraceViewerToolbarCommands.ZOOM_IN, {
            isVisible: (widget: Widget) => {
                if (widget instanceof TraceViewerWidget) {
                    return widget.isTimeRelatedChartOpened();
                }
                return false;
            },
            execute: () => {
                signalManager().fireUpdateZoomSignal(true);
            }
        });
        registry.registerCommand(
            TraceViewerToolbarCommands.ZOOM_OUT, {
            isVisible: (w: Widget) => {
                if (w instanceof TraceViewerWidget) {
                    const traceWidget = w as TraceViewerWidget;
                    return traceWidget.isTimeRelatedChartOpened();
                }
                return false;
            },
            execute: () => {
                signalManager().fireUpdateZoomSignal(false);
            }
        });
        registry.registerCommand(
            TraceViewerToolbarCommands.RESET, {
            isVisible: (widget: Widget) => {
                if (widget instanceof TraceViewerWidget) {
                    return widget.isTimeRelatedChartOpened();
                }
                return false;
            },
            execute: () => {
                signalManager().fireResetZoomSignal();
            }
        });
        registry.registerCommand(
            TraceViewerToolbarCommands.OPEN_TRACE, {
                isVisible: (w: Widget) => {
                    if (w instanceof TraceExplorerOpenedTracesWidget) {
                        return true;
                    }
                    return false;
                },
                execute: async () => {
                    await registry.executeCommand(OpenTraceCommand.id);
                }
            });

        registry.registerCommand(
            TraceViewerToolbarCommands.CHARTS_CHEATSHEET, {
            isVisible: (w: Widget) => {
                if (w instanceof TraceViewerWidget) {
                    const traceWidget = w as TraceViewerWidget;
                    return traceWidget.isTimeRelatedChartOpened();
                }
                return false;
            },
            execute: () => {
                this.chartShortcuts.open();
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
        registry.registerItem({
            id: TraceViewerToolbarCommands.FILTER.id,
            isVisible: w => {
                if (w instanceof TraceViewerWidget) {
                    const traceViewerWidget = w as TraceViewerWidget;
                    const markerCategories = traceViewerWidget.getMarkerCategories();
                    return markerCategories.size > 0;
                }
                return false;
            },
            // render() here is not a react component and hence need to disable the react display-name rule
            // eslint-disable-next-line react/display-name
            render: (widget: Widget) => <div className="item enabled">
                <div id="trace.viewer.toolbar.filter" className="fa fa-filter" title="Markers filter" onClick={async (event: React.MouseEvent) => {
                    const toDisposeOnHide = new DisposableCollection();
                    const menuPath = TraceViewerToolbarMenus.MARKER_CATEGORIES_MENU;
                    let index = 0;
                    const traceViewerWidget = widget as TraceViewerWidget;
                    const markerCategories = traceViewerWidget.getMarkerCategories();
                    markerCategories.forEach((categoryInfo, categoryName) => {
                        const toggleInd = categoryInfo.toggleInd;
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
                                traceViewerWidget.updateMarkerCategoryState(categoryName);
                            },
                            isToggled: () => toggleInd,
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
            priority: 4,
            group: 'navigation',
            onDidChange: this.onMarkerCategoriesChangedEvent,
        });
        registry.registerItem({
            id: TraceViewerToolbarCommands.MARKER_SETS.id,
            isVisible: widget => {
                if (widget instanceof TraceViewerWidget) {
                    return widget.getMarkerSets().size > 0;
                }
                return false;
            },
            // render() here is not a react component and hence need to disable the react display-name rule
            // eslint-disable-next-line react/display-name
            render: (widget: TraceViewerWidget) => <div className="item enabled">
                <div id="trace.viewer.toolbar.markersets" className="fa fa-bars" title="Marker Sets" onClick={async (event: React.MouseEvent) => {
                    const toDisposeOnHide = new DisposableCollection();
                    const menuPath = TraceViewerToolbarMenus.MARKER_SETS_MENU;
                    let index = 0;
                    const traceViewerWidget = widget as TraceViewerWidget;
                    const markerSetsMap = traceViewerWidget.getMarkerSets();
                    const sortedMarkerSets = Array.from(markerSetsMap.keys()).sort((a, b) => a.id < b.id ? -1 : 1);
                    sortedMarkerSets.forEach(markerSet => {
                        index += 1;
                        toDisposeOnHide.push(this.menus.registerMenuAction(menuPath, {
                            label: markerSet.name,
                            commandId: markerSet.name.toString() + index.toString(),
                            order: String.fromCharCode(index),
                        }));

                        toDisposeOnHide.push(this.commands.registerCommand({
                            id: markerSet.name.toString() + index.toString(),
                            label: markerSet.name
                        }, {
                            execute: () => {
                                traceViewerWidget.updateMarkerSetState(markerSet);
                            },
                            isToggled: () => !!markerSetsMap.get(markerSet)
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
            priority: 5,
            group: 'navigation',
            onDidChange: this.onMakerSetsChangedEvent,
        });
        registry.registerItem({
            id: TraceViewerToolbarCommands.OPEN_TRACE.id,
            command: TraceViewerToolbarCommands.OPEN_TRACE.id,
            tooltip: TraceViewerToolbarCommands.OPEN_TRACE.label,
            priority: 6,
        });
        registry.registerItem({
            id: TraceViewerToolbarCommands.CHARTS_CHEATSHEET.id,
            command: TraceViewerToolbarCommands.CHARTS_CHEATSHEET.id,
            tooltip: TraceViewerToolbarCommands.CHARTS_CHEATSHEET.label,
            priority: 7,
        });
    }
}
