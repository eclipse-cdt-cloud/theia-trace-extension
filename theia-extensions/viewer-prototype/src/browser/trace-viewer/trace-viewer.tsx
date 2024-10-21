import { Disposable, DisposableCollection, MessageService, Path, URI } from '@theia/core';
import { ApplicationShell, Message, StatusBar, WidgetManager, StatefulWidget } from '@theia/core/lib/browser';
import { ReactWidget } from '@theia/core/lib/browser/widgets/react-widget';
import { inject, injectable, postConstruct } from '@theia/core/shared/inversify';
import { OutputDescriptor } from 'tsp-typescript-client/lib/models/output-descriptor';
import { Trace } from 'tsp-typescript-client/lib/models/trace';
import { TspClientProvider } from '../tsp-client-provider-impl';
import { TraceManager } from 'traceviewer-base/lib/trace-manager';
import { ExperimentManager } from 'traceviewer-base/lib/experiment-manager';
import {
    TraceContextComponent,
    PersistedState
} from 'traceviewer-react-components/lib/components/trace-context-component';
import { Experiment } from 'tsp-typescript-client/lib/models/experiment';
import { TheiaMessageManager } from '../theia-message-manager';
import { ThemeService } from '@theia/core/lib/browser/theming';
import { signalManager } from 'traceviewer-base/lib/signals/signal-manager';
import { OutputAddedSignalPayload } from 'traceviewer-base/lib/signals/output-added-signal-payload';
import { TraceExplorerWidget } from '../trace-explorer/trace-explorer-widget';
import { TraceExplorerContribution } from '../trace-explorer/trace-explorer-contribution';
import { MarkerSet } from 'tsp-typescript-client/lib/models/markerset';
import { BackendFileService } from '../../common/backend-file-service';
import { CancellationTokenSource } from '@theia/core';
import { FileDialogService, SaveFileDialogProps } from '@theia/filesystem/lib/browser';
import * as React from 'react';
import 'animate.css';
import '../../../style/trace-viewer.css';

import {
    DEFAULT_OVERVIEW_OUTPUT_NAME,
    TRACE_OVERVIEW_DEFAULT_VIEW_KEY,
    getOpenTraceOverviewFailErrorMessage,
    getSwitchToDefaultViewErrorMessage,
    OverviewPreferences
} from '../trace-overview-preference';
import { ITspClient } from 'tsp-typescript-client';

export const TraceViewerWidgetOptions = Symbol('TraceViewerWidgetOptions');
export interface TraceViewerWidgetOptions {
    traceURI: string;
    traceUUID?: string;
}

@injectable()
export class TraceViewerWidget extends ReactWidget implements StatefulWidget {
    static ID = 'trace-viewer';
    static LABEL = 'Trace Viewer';

    protected uri: Path;
    protected openedExperiment: Experiment | undefined;
    protected outputDescriptors: OutputDescriptor[] = [];
    protected tspClient: ITspClient;
    protected traceManager: TraceManager;
    protected experimentManager: ExperimentManager;
    protected backgroundTheme: string;
    protected traceContextComponent: React.RefObject<TraceContextComponent>;
    protected persistedState?: PersistedState;
    protected loadTraceOverview = true;

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
    private toolbarMarkerCategoriesMap: Map<string, { categoryCount: number; toggleInd: boolean }> = new Map();
    private selectedMarkerCategoriesMap: Map<string, string[]> = new Map<string, string[]>();
    private markerSetsMap: Map<MarkerSet, boolean> = new Map<MarkerSet, boolean>();
    private selectedMarkerSetId = '';

    private onOutputAdded = (payload: OutputAddedSignalPayload): Promise<void> =>
        this.doHandleOutputAddedSignal(payload);
    private onTraceOverviewOpened = (traceId: string): Promise<void> => this.doHandleTraceOverviewOpenedSignal(traceId);
    private onTraceOverviewOutputSelected = (traceId: string, outputDescriptor: OutputDescriptor): Promise<void> =>
        this.doHandleTraceOverviewOutputSelected(traceId, outputDescriptor);
    private onExperimentSelected = (experiment?: Experiment): Promise<void> =>
        this.doHandleExperimentSelectedSignal(experiment);
    private onCloseExperiment = (UUID: string): void => this.doHandleCloseExperimentSignal(UUID);
    private onMarkerCategoryClosedSignal = (traceViewerId: string, markerCategory: string) =>
        this.doHandleMarkerCategoryClosedSignal(traceViewerId, markerCategory);
    private onSaveAsCSV = (traceId: string, data: string): Promise<void> => this.doHandleSaveAsCSVSignal(traceId, data);

    private overviewOutputDescriptor: OutputDescriptor | undefined;
    private prevOverviewOutputDescriptor: OutputDescriptor | undefined;

    @inject(TraceViewerWidgetOptions) protected readonly options: TraceViewerWidgetOptions;
    @inject(TspClientProvider) protected tspClientProvider: TspClientProvider;
    @inject(StatusBar) protected statusBar: StatusBar;
    @inject(BackendFileService) protected readonly backendFileService: BackendFileService;
    @inject(ApplicationShell) protected readonly shell: ApplicationShell;
    @inject(TheiaMessageManager) protected readonly _signalHandler: TheiaMessageManager;
    @inject(MessageService) protected readonly messageService: MessageService;
    @inject(TraceExplorerContribution) protected readonly traceExplorerContribution: TraceExplorerContribution;
    @inject(WidgetManager) protected readonly widgetManager!: WidgetManager;
    @inject(ThemeService) protected readonly themeService: ThemeService;
    @inject(OverviewPreferences) protected overviewPreferences: OverviewPreferences;
    @inject(FileDialogService) protected readonly fileDialogService: FileDialogService;

    @postConstruct()
    protected init(): void {
        this.doInit();
    }

    protected async doInit(): Promise<void> {
        this.uri = new Path(this.options.traceURI);
        this.id = 'theia-traceOpen';
        this.title.label = 'Trace: ' + this.uri.base;
        this.title.closable = true;
        this.addClass('theia-trace-open');
        this.backgroundTheme = this.themeService.getCurrentTheme().type;
        this.toDispose.push(this.themeService.onDidColorThemeChange(() => this.updateBackgroundTheme()));
        if (!this.options.traceUUID) {
            this.initialize();
        }
        this.traceContextComponent = React.createRef();
        this.tspClient = this.tspClientProvider.getTspClient();
        this.traceManager = this.tspClientProvider.getTraceManager();
        this.experimentManager = this.tspClientProvider.getExperimentManager();
        this.toDispose.push(
            Disposable.create(() => {
                this.tspClientProvider.addTspClientChangeListener(tspClient => {
                    this.tspClient = tspClient;
                    this.traceManager = this.tspClientProvider.getTraceManager();
                    this.experimentManager = this.tspClientProvider.getExperimentManager();
                });
            })
        );

        if (this.options.traceUUID) {
            const experiment = await this.experimentManager.updateExperiment(this.options.traceUUID);
            if (experiment) {
                this.openedExperiment = experiment;
                this.title.label = 'Trace: ' + experiment.name;
                this.id = experiment.UUID;
                this.experimentManager.addExperiment(experiment);
                signalManager().emit('EXPERIMENT_OPENED', experiment);
                if (this.isVisible) {
                    signalManager().emit('TRACEVIEWERTAB_ACTIVATED', experiment);
                }
                this.fetchMarkerSets(experiment.UUID);
            }
            this.update();
        }
        this.subscribeToEvents();
        this.toDispose.push(this.toDisposeOnNewExplorer);
        // Make node focusable so it can achieve focus on activate (avoid warning);
        this.node.tabIndex = 0;

        // Load the trace overview by default
        if (this.loadTraceOverview) {
            this.doHandleTraceOverviewOpenedSignal(this.openedExperiment?.UUID);
        }
    }

    protected readonly toDisposeOnNewExplorer = new DisposableCollection();

    protected subscribeToEvents(): void {
        this.toDisposeOnNewExplorer.dispose();
        signalManager().on('OUTPUT_ADDED', this.onOutputAdded);
        signalManager().on('EXPERIMENT_SELECTED', this.onExperimentSelected);
        signalManager().on('CLOSE_TRACEVIEWERTAB', this.onCloseExperiment);
        signalManager().on('MARKER_CATEGORY_CLOSED', this.onMarkerCategoryClosedSignal);
        signalManager().on('OPEN_OVERVIEW_OUTPUT', this.onTraceOverviewOpened);
        signalManager().on('OVERVIEW_OUTPUT_SELECTED', this.onTraceOverviewOutputSelected);
        signalManager().on('SAVE_AS_CSV', this.onSaveAsCSV);
    }

    protected updateBackgroundTheme(): void {
        const currentThemeType = this.themeService.getCurrentTheme().type;
        signalManager().emit('THEME_CHANGED', currentThemeType);
    }

    dispose(): void {
        super.dispose();
        signalManager().off('OUTPUT_ADDED', this.onOutputAdded);
        signalManager().off('EXPERIMENT_SELECTED', this.onExperimentSelected);
        signalManager().off('CLOSE_TRACEVIEWERTAB', this.onCloseExperiment);
        signalManager().off('OPEN_OVERVIEW_OUTPUT', this.onTraceOverviewOpened);
        signalManager().off('OVERVIEW_OUTPUT_SELECTED', this.onTraceOverviewOutputSelected);
        signalManager().off('SAVE_AS_CSV', this.onSaveAsCSV);
    }

    async initialize(): Promise<void> {
        const cancellation = new CancellationTokenSource();

        // This will show a progress dialog with "Cancel" option
        this.messageService
            .showProgress(
                {
                    text: `Opening "${this.uri.name}"`,
                    options: {
                        cancelable: true
                    }
                },
                () => {
                    cancellation.cancel();
                }
            )
            .then(async progress => {
                try {
                    progress.report({ message: 'Finding traces ', work: { done: 10, total: 100 } });
                    const tracesArray = await this.backendFileService.findTraces(
                        this.uri.toString(),
                        cancellation.token
                    );

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
                        const experiment = await this.experimentManager.openExperiment(
                            this.uri.name + this.uri.ext,
                            traces
                        );
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
                                signalManager().emit('TRACEVIEWERTAB_ACTIVATED', experiment);
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

    storeState(): PersistedState | undefined {
        /*
        TODO - BigInt support for storing state in outputs/outputDescriptors
        JSON.stringify cannot serialize BigInt
        */
        if (this.traceContextComponent?.current) {
            const persistedState = this.traceContextComponent.current.persistedState;
            return persistedState;
        }
        return undefined;
    }

    restoreState(persistedState: PersistedState): void {
        /*
        TODO - BigInt support for restoring state in outputs/outputDescriptors
        Identify what values need to be BigInt and convert.
        */
        if (persistedState.outputs.length > 0 || persistedState.storedOverviewOutput) {
            this.persistedState = persistedState;

            if (persistedState.outputs.length > 0) {
                this.outputDescriptors = persistedState.outputs;
            }

            if (persistedState.storedOverviewOutput) {
                this.overviewOutputDescriptor = persistedState.storedOverviewOutput;
            }
        }

        this.loadTraceOverview = false;
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
            signalManager().emit('EXPERIMENT_CLOSED', this.openedExperiment);
        }
    }

    onActivateRequest(msg: Message): void {
        super.onActivateRequest(msg);
        if (this.openedExperiment) {
            signalManager().emit('TRACEVIEWERTAB_ACTIVATED', this.openedExperiment);
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
        this.onOverviewRemoved = this.onOverviewRemoved.bind(this);

        return (
            <div className="trace-viewer-container">
                {this.openedExperiment ? (
                    <TraceContextComponent
                        experiment={this.openedExperiment}
                        ref={this.traceContextComponent}
                        tspClient={this.tspClient}
                        outputs={this.outputDescriptors}
                        overviewDescriptor={this.overviewOutputDescriptor}
                        markerCategoriesMap={this.selectedMarkerCategoriesMap}
                        markerSetId={this.selectedMarkerSetId}
                        onOutputRemove={this.onOutputRemoved}
                        onOverviewRemove={this.onOverviewRemoved}
                        addResizeHandler={this.addResizeHandler}
                        removeResizeHandler={this.removeResizeHandler}
                        backgroundTheme={this.backgroundTheme}
                        persistedState={this.persistedState}
                        messageManager={this._signalHandler}
                    />
                ) : (
                    'Trace is loading...'
                )}
            </div>
        );
    }

    private async fetchAnnotationCategories(output: OutputDescriptor) {
        if (this.openedExperiment) {
            const annotationCategories = await this.tspClient.fetchAnnotationsCategories(
                this.openedExperiment.UUID,
                output.id,
                this.selectedMarkerSetId
            );
            const annotationCategoriesResponse = annotationCategories.getModel();
            if (annotationCategories.isOk() && annotationCategoriesResponse) {
                const markerCategories = annotationCategoriesResponse.model
                    ? annotationCategoriesResponse.model.annotationCategories
                    : [];
                this.addMarkerCategories(output.id, markerCategories);
            }
        }
    }

    protected async doHandleOutputAddedSignal(payload: OutputAddedSignalPayload): Promise<void> {
        if (this.openedExperiment && payload.getExperiment().UUID === this.openedExperiment.UUID) {
            const exist = this.outputDescriptors.find(output => output.id === payload.getOutputDescriptor().id);
            if (!exist) {
                const output = payload.getOutputDescriptor();
                this.outputDescriptors = this.outputDescriptors.concat(output);
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
                    titleHandle?.addEventListener(
                        'animationend',
                        event => {
                            event.stopPropagation();
                            titleHandle?.classList.remove('animate__animated', 'animate__pulse');
                            resolve('Animation ended');
                        },
                        { once: true }
                    );
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

    protected onOverviewRemoved(): void {
        this.overviewOutputDescriptor = undefined;
        this.update();
    }

    protected async doHandleExperimentSelectedSignal(experiment?: Experiment): Promise<void> {
        if (this.openedExperiment && this.openedExperiment.UUID === experiment?.UUID) {
            // Update the trace UUID so that the overview can be opened
            if (this.loadTraceOverview) {
                const defaultOutputDescriptor = await this.getDefaultTraceOverviewOutputDescriptor();
                this.updateOverviewOutputDescriptor(defaultOutputDescriptor);
            }

            this.shell.activateWidget(this.openedExperiment.UUID);
        }
    }

    private async doHandleSaveAsCSVSignal(traceId: string, data: string) {
        if (this.openedExperiment && traceId === this.openedExperiment.UUID) {
            const props: SaveFileDialogProps = {
                inputValue: (this.openedExperiment !== undefined ? this.openedExperiment.name : 'trace') + '.csv',
                filters: {
                    'CSV Files': ['csv']
                },
                title: 'Save as CSV'
            };
            const uri: URI | undefined = await this.fileDialogService.showSaveDialog(props);
            if (uri) {
                const resolve = await this.backendFileService.writeToFile(uri, data);
                if (resolve === 'success') {
                    this.messageService.info('CSV saved successfully');
                } else {
                    this.messageService.error(`Failed to save trace CSV: ${resolve}`);
                }
            }
        }
    }

    private doHandleMarkerCategoryClosedSignal(traceViewerId: string, markerCategory: string) {
        if (traceViewerId === this.id) {
            this.updateMarkerCategoryState(markerCategory);
        }
    }

    private async doHandleTraceOverviewOpenedSignal(traceId: string | undefined): Promise<void> {
        if (this.openedExperiment && this.openedExperiment.UUID === traceId) {
            this.loadOverviewOutputDescriptor();
            this.shell.activateWidget(this.openedExperiment.UUID);
        }
    }

    private async doHandleTraceOverviewOutputSelected(
        traceId: string,
        outputDescriptor: OutputDescriptor
    ): Promise<void> {
        if (this.openedExperiment && traceId === this.openedExperiment.UUID && outputDescriptor) {
            await this.updateOverviewOutputDescriptor(outputDescriptor);
            this.shell.activateWidget(this.openedExperiment.UUID);
        }
    }

    private async updateOverviewOutputDescriptor(outputDescriptor: OutputDescriptor | undefined): Promise<void> {
        if (this.openedExperiment && outputDescriptor) {
            this.loadTraceOverview = false;
            this.prevOverviewOutputDescriptor = outputDescriptor; // Save the output for reopening
            this.overviewOutputDescriptor = outputDescriptor;
            this.update();
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
        signalManager().emit('MARKERSETS_FETCHED');
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
        signalManager().emit('MARKER_CATEGORIES_FETCHED');
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

    getMarkerCategories(): Map<string, { categoryCount: number; toggleInd: boolean }> {
        return this.toolbarMarkerCategoriesMap;
    }

    updateMarkerCategoryState(categoryName: string, skipUpdate?: boolean): void {
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
        if (!skipUpdate) {
            this.update();
        }
    }

    updateAllMarkerCategoryState(selectAll: boolean): void {
        const markerCategories = this.getMarkerCategories();
        for (const [key, value] of markerCategories) {
            if (value.toggleInd === selectAll) {
                continue;
            }
            this.updateMarkerCategoryState(key, true);
        }
        this.update();
    }

    async updateMarkerSetState(markerSet: MarkerSet): Promise<void> {
        const selectInd = this.markerSetsMap.get(markerSet);
        if (selectInd) {
            return;
        }
        this.selectedMarkerSetId = markerSet.id;
        const prevSelectedMarkerSet = Array.from(this.markerSetsMap.keys()).find(
            markerSetItem => this.markerSetsMap.get(markerSetItem) === true
        );
        if (prevSelectedMarkerSet) {
            this.markerSetsMap.set(prevSelectedMarkerSet, false);
        }
        this.markerSetsMap.set(markerSet, true);
        if (await Promise.all(this.outputDescriptors.map(output => this.fetchAnnotationCategories(output)))) {
            this.update();
        }
    }

    isTimeRelatedChartOpened(): boolean {
        const timeRelatedOutputs = this.outputDescriptors.filter(
            output => output.type === 'TIME_GRAPH' || output.type === 'TREE_TIME_XY'
        );
        return timeRelatedOutputs.length > 0;
    }

    isTableRelatedChartOpened(): boolean {
        const tableRelatedOutputs = this.outputDescriptors.filter(output => output.type === 'TABLE');
        return tableRelatedOutputs.length > 0;
    }

    isTraceOverviewOpened(): boolean {
        if (this.overviewOutputDescriptor) {
            return true;
        }

        return false;
    }

    openOverview(): void {
        if (this.openedExperiment?.UUID) {
            signalManager().emit('OPEN_OVERVIEW_OUTPUT', this.openedExperiment.UUID);
        }
    }

    private async loadOverviewOutputDescriptor(): Promise<void> {
        let selectedOutput: OutputDescriptor | undefined;
        if (this.prevOverviewOutputDescriptor) {
            selectedOutput = this.prevOverviewOutputDescriptor;
        } else {
            selectedOutput = await this.getDefaultTraceOverviewOutputDescriptor();
        }

        this.updateOverviewOutputDescriptor(selectedOutput);
    }

    /**
     * Get the output descriptor for the trace over view
     */
    protected async getDefaultTraceOverviewOutputDescriptor(): Promise<OutputDescriptor | undefined> {
        const availableDescriptors = await this.getAvailableTraceOverviewOutputDescriptor();

        // First, check if there is a preferred view
        const preferredViewName: string | undefined = this.overviewPreferences[TRACE_OVERVIEW_DEFAULT_VIEW_KEY];
        let descriptor: OutputDescriptor | undefined = availableDescriptors?.find(
            output => output.name.toLowerCase() === preferredViewName?.toLowerCase()
        );

        // Failed to find an output that matches the user preference, fallback to default
        if (!descriptor) {
            const defaultViewName = DEFAULT_OVERVIEW_OUTPUT_NAME;
            descriptor = availableDescriptors?.find(
                output => output.name.toLowerCase() === defaultViewName?.toLowerCase()
            );

            if (descriptor && preferredViewName) {
                this.messageService.error(getSwitchToDefaultViewErrorMessage(preferredViewName, descriptor.name));
            }
        }

        // For the current implementation of the overview, we only support XY views
        if (descriptor?.type === 'TREE_TIME_XY') {
            return descriptor;
        }

        this.messageService.error(getOpenTraceOverviewFailErrorMessage());
    }

    /**
     * Get the output descriptor for the trace over view
     */
    protected async getAvailableTraceOverviewOutputDescriptor(): Promise<OutputDescriptor[] | undefined> {
        if (this.openedExperiment) {
            const descriptors = await this.experimentManager.getAvailableOutputs(this.openedExperiment.UUID);
            const overviewOutputDescriptors = descriptors?.filter(output => output.type === 'TREE_TIME_XY');
            return overviewOutputDescriptors;
        }
    }
}
