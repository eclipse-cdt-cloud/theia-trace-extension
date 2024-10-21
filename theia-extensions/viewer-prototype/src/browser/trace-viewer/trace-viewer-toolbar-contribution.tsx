import { CommandContribution, CommandRegistry, DisposableCollection, Emitter, MenuModelRegistry } from '@theia/core';
import { ApplicationShell, ContextMenuRenderer, Widget } from '@theia/core/lib/browser';
import { TabBarToolbarContribution, TabBarToolbarRegistry } from '@theia/core/lib/browser/shell/tab-bar-toolbar';
import { inject, injectable, postConstruct } from '@theia/core/shared/inversify';
import * as React from 'react';
import { signalManager } from 'traceviewer-base/lib/signals/signal-manager';
import { TraceExplorerOpenedTracesWidget } from '../trace-explorer/trace-explorer-sub-widgets/theia-trace-explorer-opened-traces-widget';
import { ChartShortcutsDialog } from '../trace-explorer/trace-explorer-sub-widgets/charts-cheatsheet-component';
import { TspClientProvider } from '../tsp-client-provider-impl';
import { TraceViewerWidget } from './trace-viewer';
import { TraceViewerToolbarCommands, TraceViewerToolbarMenus } from './trace-viewer-toolbar-commands';
import { OpenTraceFileCommand, OpenTraceFolderCommand } from './trace-viewer-commands';

@injectable()
export class TraceViewerToolbarContribution implements TabBarToolbarContribution, CommandContribution {
    @inject(ApplicationShell) protected readonly shell: ApplicationShell;
    @inject(ContextMenuRenderer) protected readonly contextMenuRenderer!: ContextMenuRenderer;
    @inject(TspClientProvider) protected readonly tspClientProvider!: TspClientProvider;
    @inject(MenuModelRegistry) protected readonly menus: MenuModelRegistry;
    @inject(CommandRegistry) protected readonly commands: CommandRegistry;

    private onMarkerCategoriesFetchedSignal = () => this.doHandleMarkerCategoriesFetchedSignal();
    private onMarkerSetsFetchedSignal = () => this.doHandleMarkerSetsFetchedSignal();

    protected readonly onMarkerCategoriesChangedEmitter = new Emitter<void>();
    protected readonly onMarkerCategoriesChangedEvent = this.onMarkerCategoriesChangedEmitter.event;
    protected readonly onMakerSetsChangedEmitter = new Emitter<void>();
    protected readonly onMakerSetsChangedEvent = this.onMakerSetsChangedEmitter.event;

    @postConstruct()
    protected init(): void {
        signalManager().on('MARKER_CATEGORIES_FETCHED', this.onMarkerCategoriesFetchedSignal);
        signalManager().on('MARKERSETS_FETCHED', this.onMarkerSetsFetchedSignal);
    }

    private doHandleMarkerCategoriesFetchedSignal() {
        this.onMarkerCategoriesChangedEmitter.fire();
    }

    private doHandleMarkerSetsFetchedSignal() {
        this.onMakerSetsChangedEmitter.fire();
    }

    registerCommands(registry: CommandRegistry): void {
        registry.registerCommand(TraceViewerToolbarCommands.OPEN_OVERVIEW_OUTPUT, {
            isVisible: (widget: Widget) => {
                if (widget instanceof TraceViewerWidget) {
                    return true;
                }
                return false;
            },
            execute: (widget: Widget) => {
                if (widget instanceof TraceViewerWidget && !widget.isTraceOverviewOpened()) {
                    widget.openOverview();
                }
            }
        });

        registry.registerCommand(TraceViewerToolbarCommands.ZOOM_IN, {
            isVisible: (widget: Widget) => {
                if (widget instanceof TraceViewerWidget) {
                    return widget.isTimeRelatedChartOpened() || widget.isTraceOverviewOpened();
                }
                return false;
            },
            execute: () => {
                signalManager().emit('UPDATE_ZOOM', true);
            }
        });
        registry.registerCommand(TraceViewerToolbarCommands.ZOOM_OUT, {
            isVisible: (w: Widget) => {
                if (w instanceof TraceViewerWidget) {
                    const traceWidget = w as TraceViewerWidget;
                    return traceWidget.isTimeRelatedChartOpened() || traceWidget.isTraceOverviewOpened();
                }
                return false;
            },
            execute: () => {
                signalManager().emit('UPDATE_ZOOM', false);
            }
        });
        registry.registerCommand(TraceViewerToolbarCommands.UNDO, {
            isVisible: (widget: Widget) => {
                if (widget instanceof TraceViewerWidget) {
                    return widget.isTimeRelatedChartOpened() || widget.isTraceOverviewOpened();
                }
                return false;
            },
            execute: () => {
                signalManager().emit('UNDO');
            }
        });
        registry.registerCommand(TraceViewerToolbarCommands.REDO, {
            isVisible: (widget: Widget) => {
                if (widget instanceof TraceViewerWidget) {
                    return widget.isTimeRelatedChartOpened() || widget.isTraceOverviewOpened();
                }
                return false;
            },
            execute: () => {
                signalManager().emit('REDO');
            }
        });
        registry.registerCommand(TraceViewerToolbarCommands.RESET, {
            isVisible: (widget: Widget) => {
                if (widget instanceof TraceViewerWidget) {
                    return widget.isTimeRelatedChartOpened() || widget.isTraceOverviewOpened();
                }
                return false;
            },
            execute: () => {
                signalManager().emit('RESET_ZOOM');
            }
        });
        registry.registerCommand(TraceViewerToolbarCommands.OPEN_TRACE_FOLDER, {
            isVisible: (w: Widget) => {
                if (w instanceof TraceExplorerOpenedTracesWidget) {
                    return true;
                }
                return false;
            },
            execute: async () => {
                await registry.executeCommand(OpenTraceFolderCommand.id);
            }
        });

        registry.registerCommand(TraceViewerToolbarCommands.OPEN_TRACE_FILE, {
            isVisible: (w: Widget) => {
                if (w instanceof TraceExplorerOpenedTracesWidget) {
                    return true;
                }
                return false;
            },
            execute: async () => {
                await registry.executeCommand(OpenTraceFileCommand.id);
            }
        });

        registry.registerCommand(TraceViewerToolbarCommands.CHARTS_CHEATSHEET, {
            isVisible: (w: Widget) => {
                if (w instanceof TraceViewerWidget) {
                    const traceWidget = w as TraceViewerWidget;
                    return (
                        traceWidget.isTimeRelatedChartOpened() ||
                        traceWidget.isTraceOverviewOpened() ||
                        traceWidget.isTableRelatedChartOpened()
                    );
                }
                return false;
            },
            execute: async () => {
                await new ChartShortcutsDialog({ title: 'Trace Viewer Keyboard and Mouse Shortcuts' }).open();
            }
        });
    }

    registerToolbarItems(registry: TabBarToolbarRegistry): void {
        registry.registerItem({
            id: TraceViewerToolbarCommands.UNDO.id,
            command: TraceViewerToolbarCommands.UNDO.id,
            tooltip: TraceViewerToolbarCommands.UNDO.label,
            priority: 1
        });
        registry.registerItem({
            id: TraceViewerToolbarCommands.REDO.id,
            command: TraceViewerToolbarCommands.REDO.id,
            tooltip: TraceViewerToolbarCommands.REDO.label,
            priority: 2
        });
        registry.registerItem({
            id: TraceViewerToolbarCommands.ZOOM_IN.id,
            command: TraceViewerToolbarCommands.ZOOM_IN.id,
            tooltip: TraceViewerToolbarCommands.ZOOM_IN.label,
            priority: 3
        });
        registry.registerItem({
            id: TraceViewerToolbarCommands.ZOOM_OUT.id,
            command: TraceViewerToolbarCommands.ZOOM_OUT.id,
            tooltip: TraceViewerToolbarCommands.ZOOM_OUT.label,
            priority: 4
        });
        registry.registerItem({
            id: TraceViewerToolbarCommands.RESET.id,
            command: TraceViewerToolbarCommands.RESET.id,
            tooltip: TraceViewerToolbarCommands.RESET.label,
            priority: 5
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
            render: (widget: Widget) => (
                <div className="item enabled">
                    <div
                        id="trace.viewer.toolbar.filter"
                        className="fa fa-filter"
                        title="Markers filter"
                        onClick={async (event: React.MouseEvent) => {
                            const toDisposeOnHide = new DisposableCollection();
                            const menuPath = TraceViewerToolbarMenus.MARKER_CATEGORIES_MENU;
                            let index = 1;
                            const traceViewerWidget = widget as TraceViewerWidget;
                            const markerCategories = traceViewerWidget.getMarkerCategories();
                            let selectAll = true;
                            markerCategories.forEach((categoryInfo, categoryName) => {
                                const toggleInd = categoryInfo.toggleInd;

                                if (!toggleInd) {
                                    selectAll = false;
                                }

                                index += 1;
                                toDisposeOnHide.push(
                                    this.menus.registerMenuAction(menuPath, {
                                        label: categoryName,
                                        commandId: categoryName.toString() + index.toString(),
                                        order: index.toString()
                                    })
                                );
                                toDisposeOnHide.push(
                                    this.commands.registerCommand(
                                        {
                                            id: categoryName.toString() + index.toString(),
                                            label: categoryName
                                        },
                                        {
                                            execute: () => {
                                                traceViewerWidget.updateMarkerCategoryState(categoryName);
                                            },
                                            isToggled: () => toggleInd
                                        }
                                    )
                                );
                            });

                            toDisposeOnHide.push(
                                this.menus.registerMenuAction(menuPath, {
                                    label: 'Select all',
                                    commandId: 'Select all' + index.toString(),
                                    order: '0'
                                })
                            );
                            toDisposeOnHide.push(
                                this.commands.registerCommand(
                                    {
                                        id: 'Select all' + index.toString(),
                                        label: 'Select all'
                                    },
                                    {
                                        execute: () => {
                                            traceViewerWidget.updateAllMarkerCategoryState(!selectAll);
                                            return;
                                        },
                                        isToggled: () => selectAll
                                    }
                                )
                            );

                            return this.contextMenuRenderer.render({
                                menuPath,
                                args: [],
                                anchor: { x: event.clientX, y: event.clientY },
                                onHide: () => setTimeout(() => toDisposeOnHide.dispose())
                            });
                        }}
                    ></div>
                </div>
            ),
            priority: 6,
            group: 'navigation',
            onDidChange: this.onMarkerCategoriesChangedEvent
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
            render: (widget: TraceViewerWidget) => (
                <div className="item enabled">
                    <div
                        id="trace.viewer.toolbar.markersets"
                        className="fa fa-bars"
                        title="Marker Sets"
                        onClick={async (event: React.MouseEvent) => {
                            const toDisposeOnHide = new DisposableCollection();
                            const menuPath = TraceViewerToolbarMenus.MARKER_SETS_MENU;
                            let index = 0;
                            const traceViewerWidget = widget as TraceViewerWidget;
                            const markerSetsMap = traceViewerWidget.getMarkerSets();
                            const sortedMarkerSets = Array.from(markerSetsMap.keys()).sort((a, b) =>
                                a.id < b.id ? -1 : 1
                            );
                            sortedMarkerSets.forEach(markerSet => {
                                index += 1;
                                toDisposeOnHide.push(
                                    this.menus.registerMenuAction(menuPath, {
                                        label: markerSet.name,
                                        commandId: markerSet.name.toString() + index.toString(),
                                        order: String.fromCharCode(index)
                                    })
                                );

                                toDisposeOnHide.push(
                                    this.commands.registerCommand(
                                        {
                                            id: markerSet.name.toString() + index.toString(),
                                            label: markerSet.name
                                        },
                                        {
                                            execute: () => {
                                                traceViewerWidget.updateMarkerSetState(markerSet);
                                            },
                                            isToggled: () => !!markerSetsMap.get(markerSet)
                                        }
                                    )
                                );
                            });
                            return this.contextMenuRenderer.render({
                                menuPath,
                                args: [],
                                anchor: { x: event.clientX, y: event.clientY },
                                onHide: () => setTimeout(() => toDisposeOnHide.dispose())
                            });
                        }}
                    ></div>
                </div>
            ),
            priority: 7,
            group: 'navigation',
            onDidChange: this.onMakerSetsChangedEvent
        });
        registry.registerItem({
            id: TraceViewerToolbarCommands.OPEN_TRACE_FILE.id,
            command: TraceViewerToolbarCommands.OPEN_TRACE_FILE.id,
            tooltip: TraceViewerToolbarCommands.OPEN_TRACE_FILE.label,
            priority: 8
        });
        registry.registerItem({
            id: TraceViewerToolbarCommands.OPEN_TRACE_FOLDER.id,
            command: TraceViewerToolbarCommands.OPEN_TRACE_FOLDER.id,
            tooltip: TraceViewerToolbarCommands.OPEN_TRACE_FOLDER.label,
            priority: 9
        });
        registry.registerItem({
            id: TraceViewerToolbarCommands.OPEN_OVERVIEW_OUTPUT.id,
            command: TraceViewerToolbarCommands.OPEN_OVERVIEW_OUTPUT.id,
            tooltip: TraceViewerToolbarCommands.OPEN_OVERVIEW_OUTPUT.label,
            priority: 10
        });
        registry.registerItem({
            id: TraceViewerToolbarCommands.CHARTS_CHEATSHEET.id,
            command: TraceViewerToolbarCommands.CHARTS_CHEATSHEET.id,
            tooltip: TraceViewerToolbarCommands.CHARTS_CHEATSHEET.label,
            priority: 11
        });
    }
}
