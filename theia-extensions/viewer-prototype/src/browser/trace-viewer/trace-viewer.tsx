import { DisposableCollection, MessageService, Path } from '@theia/core';
import { ApplicationShell, Message, StatusBar, WidgetManager } from '@theia/core/lib/browser';
import { ReactWidget } from '@theia/core/lib/browser/widgets/react-widget';
import { inject, injectable, postConstruct } from 'inversify';
import { OutputDescriptor } from 'tsp-typescript-client/lib/models/output-descriptor';
import { Trace } from 'tsp-typescript-client/lib/models/trace';
import { TspClient } from 'tsp-typescript-client/lib/protocol/tsp-client';
import { TspClientProvider } from '../tsp-client-provider-impl';
import { TraceManager } from 'traceviewer-base/lib/trace-manager';
import { ExperimentManager } from 'traceviewer-base/lib/experiment-manager';
import { TraceContextComponent } from 'traceviewer-react-components/lib/components/trace-context-component';
import { Experiment } from 'tsp-typescript-client/lib/models/experiment';
import { TheiaMessageManager } from '../theia-message-manager';
import { ThemeService } from '@theia/core/lib/browser/theming';
import { signalManager, Signals } from 'traceviewer-base/lib/signals/signal-manager';
import { OutputAddedSignalPayload } from 'traceviewer-base/lib/signals/output-added-signal-payload';
import { TraceExplorerWidget } from '../trace-explorer/trace-explorer-widget';
import { TraceExplorerContribution } from '../trace-explorer/trace-explorer-contribution';
import { MarkerSet } from 'tsp-typescript-client/lib/models/markerset';
import { BackendFileService } from '../../common/backend-file-service';
import { CancellationTokenSource } from '@theia/core';
import * as React from 'react';
import 'animate.css';

export const TraceViewerWidgetOptions = Symbol('TraceViewerWidgetOptions');
export interface TraceViewerWidgetOptions {
    traceURI: string;
    traceUUID?: string;
}

@injectable()
export class TraceViewerWidget extends ReactWidget {
    static ID = 'trace-viewer';
    static LABEL = 'Trace Viewer';

    protected uri: Path;
    protected openedExperiment: Experiment | undefined;
    protected outputDescriptors: OutputDescriptor[] = [];
    protected tspClient: TspClient;
    protected traceManager: TraceManager;
    protected experimentManager: ExperimentManager;
    protected backgroundTheme: string;

    protected resizeHandlers: (() => void)[] = [];
    protected readonly addResizeHandler = (h: () => void): void => {
        this.resizeHandlers.push(h);
    };
    protected readonly removeResizeHandler = (h: () => void): void => {
        const index = this.resizeHandlers.indexOf(h, 0);
        if (index > -1) {
            this.resizeHandlers.splice(index, 1);
        }
    };
    protected explorerWidget: TraceExplorerWidget;

    private markerCategoriesMap: Map<string, string[]> = new Map<string, string[]>();
    private toolbarMarkerCategoriesMap: Map<string, { categoryCount: number, toggleInd: boolean }> = new Map();
    private selectedMarkerCategoriesMap: Map<string, string[]> = new Map<string, string[]>();
    private markerSetsMap: Map<MarkerSet, boolean> = new Map<MarkerSet, boolean>();
    private selectedMarkerSetId = '';

    private onOutputAdded = (payload: OutputAddedSignalPayload): Promise<void> => this.doHandleOutputAddedSignal(payload);
    private onExperimentSelected = (experiment: Experiment): void => this.doHandleExperimentSelectedSignal(experiment);
    private onCloseExperiment = (UUID: string): void => this.doHandleCloseExperimentSignal(UUID);
    private onMarkerCategoryClosedSignal = (payload: { traceViewerId: string, markerCategory: string }) => this.doHandleMarkerCategoryClosedSignal(payload);

    @inject(TraceViewerWidgetOptions) protected readonly options: TraceViewerWidgetOptions;
    @inject(TspClientProvider) protected tspClientProvider: TspClientProvider;
    @inject(StatusBar) protected statusBar: StatusBar;
    @inject(BackendFileService) protected readonly backendFileService: BackendFileService;
    @inject(ApplicationShell) protected readonly shell: ApplicationShell;
    @inject(TheiaMessageManager) protected readonly _signalHandler: TheiaMessageManager;
    @inject(MessageService) protected readonly messageService: MessageService;
    @inject(TraceExplorerContribution) protected readonly traceExplorerContribution: TraceExplorerContribution;
    @inject(WidgetManager) protected readonly widgetManager!: WidgetManager;

    @postConstruct()
    async init(): Promise<void> {
        this.uri = new Path(this.options.traceURI);
        this.id = 'theia-traceOpen';
        this.title.label = 'Trace: ' + this.uri.base;
        this.title.closable = true;
        this.addClass('theia-trace-open');
        this.backgroundTheme = ThemeService.get().getCurrentTheme().type;
        ThemeService.get().onDidColorThemeChange(() => this.updateBackgroundTheme());
        if (!this.options.traceUUID) {
            this.initialize();
        }
        this.tspClient = this.tspClientProvider.getTspClient();
        this.traceManager = this.tspClientProvider.getTraceManager();
        this.experimentManager = this.tspClientProvider.getExperimentManager();
        this.tspClientProvider.addTspClientChangeListener(tspClient => {
            this.tspClient = tspClient;
            this.traceManager = this.tspClientProvider.getTraceManager();
            this.experimentManager = this.tspClientProvider.getExperimentManager();
        });
        if (this.options.traceUUID) {
            const experiment = await this.experimentManager.updateExperiment(this.options.traceUUID);
            if (experiment) {
                this.openedExperiment = experiment;
                this.title.label = 'Trace: ' + experiment.name;
                this.id = experiment.UUID;
                this.experimentManager.addExperiment(experiment);
                signalManager().fireExperimentOpenedSignal(experiment);
                if (this.isVisible) {
                    signalManager().fireTraceViewerTabActivatedSignal(experiment);
                }
                this.fetchMarkerSets(experiment.UUID);
            }
            this.update();
        }
        this.subscribeToEvents();
        this.toDispose.push(this.toDisposeOnNewExplorer);
        // Make node focusable so it can achieve focus on activate (avoid warning);
        this.node.tabIndex = 0;
    }

    protected readonly toDisposeOnNewExplorer = new DisposableCollection();

    protected subscribeToEvents(): void {
        this.toDisposeOnNewExplorer.dispose();
        signalManager().on(Signals.OUTPUT_ADDED, this.onOutputAdded);
        signalManager().on(Signals.EXPERIMENT_SELECTED, this.onExperimentSelected);
        signalManager().on(Signals.CLOSE_TRACEVIEWERTAB, this.onCloseExperiment);
        signalManager().on(Signals.MARKER_CATEGORY_CLOSED, this.onMarkerCategoryClosedSignal);
    }

    protected updateBackgroundTheme(): void {
        const currentThemeType = ThemeService.get().getCurrentTheme().type;
        signalManager().fireThemeChangedSignal(currentThemeType);
    }

    dispose(): void {
        super.dispose();
        signalManager().off(Signals.OUTPUT_ADDED, this.onOutputAdded);
        signalManager().off(Signals.EXPERIMENT_SELECTED, this.onExperimentSelected);
        signalManager().off(Signals.CLOSE_TRACEVIEWERTAB, this.onCloseExperiment);
    }

    async initialize(): Promise<void> {
        const cancellation = new CancellationTokenSource();

        // This will show a progress dialog with "Cancel" option
        this.messageService.showProgress({
                text: 'Open traces',
                options: {
                    cancelable: true
                }
            },
            () => {
                cancellation.cancel();
            })
            .then(async progress => {
                try {
                    progress.report({ message: 'Finding traces ', work: { done: 10, total: 100 } });
                    const tracesArray = await this.backendFileService.findTraces(this.uri.toString(), cancellation.token);

                    if (cancellation.token.isCancellationRequested) {
                        progress.report({ message: 'Complete', work: { done: 100, total: 100 } });
                        this.dispose();
                        return;
                    }

                    // Check if the folder is empty.
                    if (tracesArray.length === 0) {
                        progress.report({ message: 'Complete', work: { done: 100, total: 100 } });
                        progress.cancel();
                        this.messageService.error('No valid traces found in the selected directory: ' + this.uri);
                        this.dispose();
                        return;
                    }

                    progress.report({ message: 'Opening traces', work: { done: 30, total: 100 } });
                    const traces = new Array<Trace>();
                    const invalidTraces = new Array<string>();
                    for (let i = 0; i < tracesArray.length; i++) {
                        if (cancellation.token.isCancellationRequested) {
                            break;
                        }
                        const tracePath = new Path(tracesArray[i]);
                        const traceName = tracePath.name + tracePath.ext;
                        const trace = await this.traceManager.openTrace(tracesArray[i], traceName);
                        if (trace) {
                            traces.push(trace);
                        } else {
                            invalidTraces.push(traceName);
                        }
                    }

                    if (cancellation.token.isCancellationRequested) {
                        // Rollback traces
                        progress.report({ message: 'Rolling back traces', work: { done: 50, total: 100 } });
                        for (let i = 0; i < traces.length; i++) {
                            await this.traceManager.deleteTrace(traces[i].UUID);
                        }
                        progress.report({ message: 'Complete', work: { done: 100, total: 100 } });
                        this.dispose();
                        return;
                    }
                    progress.report({ message: 'Merging traces', work: { done: 70, total: 100 } });

                    if (traces === undefined || traces.length === 0) {
                        // All the traces are invalid. Display the error message and exit.
                        this.messageService.error('Invalid trace(s): ' + invalidTraces.toString());
                        this.dispose();
                    } else {
                        const experiment = await this.experimentManager.openExperiment(this.uri.name + this.uri.ext, traces);
                        if (experiment) {
                            const widgets = this.widgetManager.getWidgets(TraceViewerWidget.ID);
                            const widget = widgets.find(w => w.id === experiment.UUID);
                            let sendSignal = true;
                            if (widget) {
                                // Close widget if it had been opened previously.
                                cancellation.cancel();
                                this.dispose();
                            } else {
                                this.openedExperiment = experiment;
                                this.title.label = 'Trace: ' + experiment.name;
                                this.id = experiment.UUID;
                                sendSignal = this.isVisible;
                                this.fetchMarkerSets(experiment.UUID);
                            }
                            if (sendSignal) {
                                signalManager().fireTraceViewerTabActivatedSignal(experiment);
                            }
                            this.traceExplorerContribution.openView({
                                activate: true
                            });
                        }
                        // Check if there are any invalid traces and display the warning message with the names of the invalid traces if any.
                        if (Array.isArray(invalidTraces) && invalidTraces.length) {
                            this.messageService.warn('Invalid trace(s): ' + invalidTraces.toString());
                        }
                    }
                    this.update();
                } catch (e) {
                    cancellation.cancel();
                    this.dispose();
                }
                progress.report({ message: 'Complete', work: { done: 100, total: 100 } });
                progress.cancel();
            });
    }

    private async fetchMarkerSets(expUUID: string) {
        const markers = await this.tspClient.fetchMarkerSets(expUUID);
        const markersResponse = markers.getModel();
        if (markersResponse && markers.isOk()) {
            this.addMarkerSets(markersResponse.model);
        }
    }

    async onCloseRequest(msg: Message): Promise<void> {
        this.statusBar.removeElement('time-selection-range');
        super.onCloseRequest(msg);
        if (this.openedExperiment) {
            signalManager().fireExperimentClosedSignal(this.openedExperiment);
        }
    }

    onAfterShow(msg: Message): void {
        super.onAfterShow(msg);
        if (this.openedExperiment) {
            signalManager().fireTraceViewerTabActivatedSignal(this.openedExperiment);
        }
    }

    onActivateRequest(msg: Message): void {
        super.onActivateRequest(msg);
        if (this.openedExperiment) {
            signalManager().fireTraceViewerTabActivatedSignal(this.openedExperiment);
        }
        this.node.focus();
    }

    protected onResize(): void {
        this.resizeHandlers.forEach(h => h());
    }

    protected doHandleCloseExperimentSignal(UUID: string): void {
        this.shell.closeWidget(UUID);
    }

    protected render(): React.ReactNode {
        this.onOutputRemoved = this.onOutputRemoved.bind(this);
        return <div className='trace-viewer-container'>
            {this.openedExperiment ? <TraceContextComponent experiment={this.openedExperiment}
                tspClient={this.tspClient}
                outputs={this.outputDescriptors}
                markerCategoriesMap={this.selectedMarkerCategoriesMap}
                markerSetId={this.selectedMarkerSetId}
                onOutputRemove={this.onOutputRemoved}
                addResizeHandler={this.addResizeHandler}
                removeResizeHandler={this.removeResizeHandler}
                backgroundTheme={this.backgroundTheme}
                messageManager={this._signalHandler} /> : 'Trace is loading...'}
        </div>;
    }

    private async fetchAnnotationCategories(output: OutputDescriptor) {
        if (this.openedExperiment) {
            const annotationCategories = await this.tspClient.fetchAnnotationsCategories(this.openedExperiment.UUID, output.id, this.selectedMarkerSetId);
            const annotationCategoriesResponse = annotationCategories.getModel();
            if (annotationCategories.isOk() && annotationCategoriesResponse) {
                const markerCategories = annotationCategoriesResponse.model ? annotationCategoriesResponse.model.annotationCategories : [];
                this.addMarkerCategories(output.id, markerCategories);
            }
        }
    }

    protected async doHandleOutputAddedSignal(payload: OutputAddedSignalPayload): Promise<void> {
        if (this.openedExperiment && payload.getExperiment().UUID === this.openedExperiment.UUID) {
            const exist = this.outputDescriptors.find(output => output.id === payload.getOutputDescriptor().id);
            if (!exist) {
                const output = payload.getOutputDescriptor();
                this.outputDescriptors =  this.outputDescriptors.concat(output);
                await this.fetchAnnotationCategories(output);
                this.update();
            } else {
                const traceId = this.openedExperiment.UUID;
                if (document.getElementById(traceId + exist.id + 'focusContainer')) {
                    document.getElementById(traceId + exist.id + 'focusContainer')?.focus();
                } else {
                    document.getElementById(traceId + exist.id)?.focus();
                }

                await new Promise(resolve => {
                    const titleHandle = document.getElementById(traceId + exist.id + 'handle');
                    titleHandle?.classList.add('animate__animated', 'animate__pulse');
                    titleHandle?.addEventListener('animationend', event => {
                        event.stopPropagation();
                        titleHandle?.classList.remove('animate__animated', 'animate__pulse');
                        resolve('Animation ended');
                    }, {once: true});
                });
            }
        }
    }

    protected onOutputRemoved(outputId: string): void {
        const outputToKeep = this.outputDescriptors.filter(output => output.id !== outputId);
        this.outputDescriptors = outputToKeep;
        this.removeMarkerCategories(outputId);
        this.update();
    }

    protected doHandleExperimentSelectedSignal(experiment: Experiment): void {
        if (this.openedExperiment && this.openedExperiment.UUID === experiment.UUID) {
            this.shell.activateWidget(this.openedExperiment.UUID);
        }
    }

    private doHandleMarkerCategoryClosedSignal(payload: { traceViewerId: string, markerCategory: string }) {
        const traceViewerId = payload.traceViewerId;
        const markerCategory = payload.markerCategory;
        if (traceViewerId === this.id) {
            this.updateMarkerCategoryState(markerCategory);
        }
    }

    private addMarkerSets(markerSets: MarkerSet[]) {
        this.markerSetsMap = new Map<MarkerSet, boolean>();
        if (markerSets.length) {
            this.markerSetsMap.set({ name: 'None', id: '' }, true);
        }
        markerSets.forEach(markerSet => {
            if (!this.markerSetsMap.has(markerSet)) {
                this.markerSetsMap.set(markerSet, false);
            }
        });
        signalManager().fireMarkerSetsFetchedSignal();
    }

    private addMarkerCategories(outputId: string, markerCategories: string[]) {
        this.removeMarkerCategories(outputId);
        const selectedMarkerCategories: string[] = [];
        markerCategories.forEach(category => {
            const categoryInfo = this.toolbarMarkerCategoriesMap.get(category);
            const categoryCount = categoryInfo ? categoryInfo.categoryCount + 1 : 1;
            const toggleInd = categoryInfo ? categoryInfo.toggleInd : true;
            this.toolbarMarkerCategoriesMap.set(category, { categoryCount, toggleInd });
            if (toggleInd) {
                selectedMarkerCategories.push(category);
            }
        });
        this.selectedMarkerCategoriesMap.set(outputId, selectedMarkerCategories);
        this.markerCategoriesMap.set(outputId, markerCategories);
        signalManager().fireMarkerCategoriesFetchedSignal();
    }

    private removeMarkerCategories(outputId: string) {
        const categoriesToRemove = this.markerCategoriesMap.get(outputId);
        if (categoriesToRemove) {
            categoriesToRemove.forEach(category => {
                const categoryInfo = this.toolbarMarkerCategoriesMap.get(category);
                const categoryCount = categoryInfo ? categoryInfo.categoryCount - 1 : 0;
                const toggleInd = categoryInfo ? categoryInfo.toggleInd : true;
                if (categoryCount === 0) {
                    this.toolbarMarkerCategoriesMap.delete(category);
                } else {
                    this.toolbarMarkerCategoriesMap.set(category, { categoryCount, toggleInd });
                }
            });
        }
        this.markerCategoriesMap.delete(outputId);
        this.selectedMarkerCategoriesMap.delete(outputId);
    }

    getMarkerSets(): Map<MarkerSet, boolean> {
        return this.markerSetsMap;
    }

    getMarkerCategories(): Map<string, { categoryCount: number, toggleInd: boolean }> {
        return this.toolbarMarkerCategoriesMap;
    }

    updateMarkerCategoryState(categoryName: string): void {
        const toggledmarkerCategory = this.toolbarMarkerCategoriesMap.get(categoryName);
        if (toggledmarkerCategory) {
            const categoryCount = toggledmarkerCategory?.categoryCount;
            const toggleInd = !!!toggledmarkerCategory?.toggleInd;
            this.toolbarMarkerCategoriesMap.set(categoryName, { categoryCount, toggleInd });
            this.markerCategoriesMap.forEach((categoriesList, outputId) => {
                const selectedMarkerCategories = categoriesList.filter(category => {
                    const currCategoryInfo = this.toolbarMarkerCategoriesMap.get(category);
                    return currCategoryInfo ? currCategoryInfo.toggleInd : false;
                });
                this.selectedMarkerCategoriesMap.set(outputId, selectedMarkerCategories);
            });
        }
        this.update();
    }

    async updateMarkerSetState(markerSet: MarkerSet): Promise<void> {
        const selectInd = this.markerSetsMap.get(markerSet);
        if (selectInd) {
            return;
        }
        this.selectedMarkerSetId = markerSet.id;
        const prevSelectedMarkerSet = Array.from(this.markerSetsMap.keys()).find(markerSetItem => this.markerSetsMap.get(markerSetItem) === true);
        if (prevSelectedMarkerSet) {
            this.markerSetsMap.set(prevSelectedMarkerSet, false);
        }
        this.markerSetsMap.set(markerSet, true);
        if (await Promise.all(this.outputDescriptors.map(output => this.fetchAnnotationCategories(output)))) {
            this.update();
        }
    }

    isTimeRelatedChartOpened(): boolean {
        const timeRelatedOutputs = this.outputDescriptors.filter(output => output.type === 'TIME_GRAPH' || output.type === 'TREE_TIME_XY');
        return timeRelatedOutputs.length > 0;
    }
}
