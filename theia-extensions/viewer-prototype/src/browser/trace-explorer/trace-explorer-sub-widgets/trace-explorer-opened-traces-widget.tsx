import { inject, injectable, postConstruct } from 'inversify';
import { ReactWidget, Message, Widget } from '@theia/core/lib/browser';
import * as React from 'react';
import { List, ListRowProps, Index, AutoSizer } from 'react-virtualized';
import { Experiment } from 'tsp-typescript-client/lib/models/experiment';
import { ExperimentManager } from '@trace-viewer/base/lib/experiment-manager';
import { OutputDescriptor } from 'tsp-typescript-client/lib/models/output-descriptor';
import { CommandService } from '@theia/core';
import { TspClientProvider } from '../../tsp-client-provider';
import { signalManager, Signals } from '@trace-viewer/base/lib/signals/signal-manager';
import { TraceExplorerTooltipWidget } from './trace-explorer-tooltip-widget';
import ReactModal from 'react-modal';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCopy } from '@fortawesome/free-solid-svg-icons';
import { ContextMenuRenderer } from '@theia/core/lib/browser';
import { TraceExplorerMenus } from '../trace-explorer-commands';
import { TraceViewerCommand } from '../../trace-viewer/trace-viewer-commands';
import { AvailableAnalysesChangedSignalPayload } from '@trace-viewer/base/lib/signals/available-analyses-changed-signal-payload';

@injectable()
export class TraceExplorerOpenedTracesWidget extends ReactWidget {
    static ID = 'trace-explorer-opened-traces-widget';
    static LABEL = 'Opened Traces';
    static LIST_MARGIN = 2;
    static LINE_HEIGHT = 16;

    protected forceUpdateKey = false;

    @inject(TspClientProvider) protected readonly tspClientProvider!: TspClientProvider;
    @inject(TraceExplorerTooltipWidget) protected readonly tooltipWidget!: TraceExplorerTooltipWidget;
    @inject(ContextMenuRenderer) protected readonly contextMenuRenderer!: ContextMenuRenderer;
    @inject(CommandService) protected readonly commandService!: CommandService;

    sharingLink = '';
    showShareDialog = false;

    protected _openedExperiments: Array<Experiment> = [];
    get openedExperiments(): Array<Experiment> {
        return this._openedExperiments;
    }

    protected _selectedExperimentIndex = 0;
    protected _availableOutputDescriptors: Map<string, OutputDescriptor[]> = new Map();
    protected experimentManager!: ExperimentManager;
    protected selectedExperiment: Experiment | undefined;

    private onExperimentOpened = (openedExperiment: Experiment): Promise<void> => this.doHandleExperimentOpenedSignal(openedExperiment);
    private onExperimentClosed = (closedExperiment: Experiment): Promise<void> => this.doHandleExperimentClosedSignal(closedExperiment);
    private onOpenedTracesWidgetActivated = (experiment: Experiment): void => this.doHandleTracesWidgetActivatedSignal(experiment);

    @postConstruct()
    async init(): Promise<void> {
        this.id = TraceExplorerOpenedTracesWidget.ID;
        this.title.label = TraceExplorerOpenedTracesWidget.LABEL;

        signalManager().on(Signals.EXPERIMENT_OPENED, this.onExperimentOpened);
        signalManager().on(Signals.EXPERIMENT_CLOSED, this.onExperimentClosed);
        signalManager().on(Signals.EXPERIMENT_SELECTED, this.onOpenedTracesWidgetActivated);
        signalManager().on(Signals.TRACEVIEWERTAB_ACTIVATED, this.onOpenedTracesWidgetActivated);

        this.experimentManager = this.tspClientProvider.getExperimentManager();
        this.tspClientProvider.addTspClientChangeListener(() => {
            this.experimentManager = this.tspClientProvider.getExperimentManager();
        });

        await this.initialize();
        this.update();
    }

    dispose(): void {
        super.dispose();
        signalManager().off(Signals.EXPERIMENT_OPENED, this.onExperimentOpened);
        signalManager().off(Signals.EXPERIMENT_CLOSED, this.onExperimentClosed);
        signalManager().off(Signals.EXPERIMENT_SELECTED, this.onOpenedTracesWidgetActivated);
        signalManager().off(Signals.TRACEVIEWERTAB_ACTIVATED, this.onOpenedTracesWidgetActivated);
    }

    async initialize(): Promise<void> {
        await this.updateOpenedExperiments();
        await this.updateAvailableViews(undefined);
    }

    protected async doHandleExperimentOpenedSignal(openedExperiment: Experiment): Promise<void> {
        await this.updateOpenedExperiments();
        await this.updateAvailableViews(openedExperiment);
    }

    protected async doHandleExperimentClosedSignal(_closedExperiment: Experiment): Promise<void> {
        this.tooltipWidget.tooltip = {};
        await this.updateOpenedExperiments();
        await this.updateAvailableViews(undefined);
    }

    protected doHandleTracesWidgetActivatedSignal(experiment: Experiment): void {
        this.selectedExperiment = experiment;
        const selectedIndex = this._openedExperiments.findIndex(openedExperiment => openedExperiment.UUID === experiment.UUID);
        this.selectExperiment(selectedIndex);
    }

    protected doHandleContextMenuEvent(event: React.MouseEvent<HTMLDivElement>, traceUUID: string): void {
        this.doHandleOnExperimentSelected(event);
        this.contextMenuRenderer.render({
            menuPath: TraceExplorerMenus.PREFERENCE_EDITOR_CONTEXT_MENU,
            anchor: { x: event.clientX, y: event.clientY },
            args: [traceUUID]
        });
        event.preventDefault();
        event.stopPropagation();
    }

    protected doHandleDoubleClickEvent(event: React.MouseEvent<HTMLDivElement>, traceUUID: string): void {
        this.openExperiment(traceUUID);
    }

    public openExperiment(traceUUID: string): void {
        this.commandService.executeCommand(TraceViewerCommand.id, { traceUUID });
    }

    public closeExperiment(traceUUID: string): void {
        signalManager().fireCloseTraceViewerTabSignal(traceUUID);
    }

    public deleteExperiment(traceUUID: string): void {
        this.experimentManager.closeExperiment(traceUUID);
        this.closeExperiment(traceUUID);
    }

    render(): React.ReactNode {
        const totalHeight = this.getTotalHeight();
        this.forceUpdateKey = !this.forceUpdateKey;
        const key = Number(this.forceUpdateKey);
        return (
            <>
                <ReactModal isOpen={this.showShareDialog} onRequestClose={this.handleShareModalClose}
                    ariaHideApp={false} className='sharing-modal' overlayClassName='sharing-overlay'>
                    {this.renderSharingModal()}
                </ReactModal>
                <div className='trace-explorer-opened'>
                    <div className='trace-explorer-panel-content'
                        onClick={this.updateOpenedExperiments}>
                        <AutoSizer>
                            {({ width }) =>
                                <List
                                    key={key}
                                    height={totalHeight}
                                    width={width}
                                    rowCount={this._openedExperiments.length}
                                    rowHeight={this.getRowHeight}
                                    rowRenderer={this.renderExperimentRow}
                                />}
                        </AutoSizer>
                    </div>
                </div>
            </>
        );
    }

    protected renderExperimentRow = (props: ListRowProps): React.ReactNode => this.doRenderExperimentRow(props);

    /*
        TODO: Implement better visualization of experiment, e.g. a tree
        with experiment name as root and traces (name and path) as children
     */
    protected doRenderExperimentRow(props: ListRowProps): React.ReactNode {
        const traceName = this._openedExperiments.length && props.index < this._openedExperiments.length
            ? this._openedExperiments[props.index].name : '';
        const traceUUID = this._openedExperiments.length && props.index < this._openedExperiments.length
            ? this._openedExperiments[props.index].UUID : '';
        let traceContainerClassName = 'trace-list-container';
        if (props.index === this._selectedExperimentIndex) {
            traceContainerClassName = traceContainerClassName + ' theia-mod-selected';
        }
        return <div className={traceContainerClassName}
            id={`${traceContainerClassName}-${props.index}`}
            key={props.key}
            style={props.style}
            onClick={this.handleOnExperimentSelected}
            onContextMenu={event => { this.handleContextMenuEvent(event, traceUUID); }}
            onDoubleClick={event => { this.handleDoubleClickEvent(event, traceUUID); }}
            data-id={`${props.index}`}>
            <div className='trace-element-container'>
                <div className='trace-element-info' >
                    <h4 className='trace-element-name'>{traceName}</h4>
                    {this.renderTracesForExperiment(props.index)}
                </div>
                {/* <div className='trace-element-options'>
                    <button className='share-context-button' onClick={this.handleShareButtonClick.bind(this, props.index)}>
                        <FontAwesomeIcon icon={faShareSquare} />
                    </button>
                </div> */}
            </div>
        </div>;
    }

    protected renderTracesForExperiment(index: number): React.ReactNode {
        const tracePaths = this._openedExperiments[index].traces;
        return (
            <div className='trace-element-path-container'>
                {tracePaths.map(trace => (
                    <div className='trace-element-path child-element' id={trace.UUID} key={trace.UUID}>
                        {` > ${trace.name}`}
                    </div>
                ))}
            </div>
        );
    }

    protected getRowHeight = (index: Index | number): number => this.doGetRowHeight(index);

    protected doGetRowHeight(index: Index | number): number {
        const resolvedIndex = typeof index === 'object' ? index.index : index;
        const experiment = this._openedExperiments[resolvedIndex];
        let totalHeight = 0;
        if (experiment.name) {
            totalHeight += TraceExplorerOpenedTracesWidget.LINE_HEIGHT;
        }
        for (let i = 0; i < experiment.traces.length; i++) {
            totalHeight += TraceExplorerOpenedTracesWidget.LINE_HEIGHT;
        }
        return totalHeight;
    }

    protected getTotalHeight(): number {
        let totalHeight = 0;
        for (let i = 0; i < this._openedExperiments.length; i++) {
            totalHeight += this.getRowHeight(i);
        }
        return totalHeight;
    }

    protected renderSharingModal(): React.ReactNode {
        if (this.sharingLink.length) {
            return <div className='sharing-container'>
                <div className='sharing-description'>
                    {'Copy URL to share your trace context'}
                </div>
                <div className='sharing-link-info'>
                    <div className='sharing-link'>
                        <textarea rows={1} cols={this.sharingLink.length} readOnly={true} value={this.sharingLink} />
                    </div>
                    <div className='sharing-link-copy'>
                        <button className='copy-link-button'>
                            <FontAwesomeIcon icon={faCopy} />
                        </button>
                    </div>
                </div>
            </div>;
        }
        return <div style={{ color: 'white' }}>
            {'Cannot share this trace'}
        </div>;
    }

    protected updateOpenedExperiments = async (): Promise<void> => this.doUpdateOpenedExperiments();

    protected async doUpdateOpenedExperiments(): Promise<void> {
        this._openedExperiments = await this.experimentManager.getOpenedExperiments();
        this._openedExperiments.forEach(experiment => {
            this.experimentManager.addExperiment(experiment);
        });
        const selectedIndex = this._openedExperiments.findIndex(experiment => this.selectedExperiment &&
            experiment.UUID === this.selectedExperiment.UUID);
        this._selectedExperimentIndex = selectedIndex !== -1 ? selectedIndex : 0;
        this.update();
    }

    protected handleShareButtonClick = (index: number): void => this.doHandleShareButtonClick(index);

    protected doHandleShareButtonClick(index: number): void {
        const traceToShare = this._openedExperiments[index];
        this.sharingLink = 'https://localhost:3000/share/trace?' + traceToShare.UUID;
        this.showShareDialog = true;
        this.update();
    }

    protected handleOnExperimentSelected = (e: React.MouseEvent<HTMLDivElement>): void => this.doHandleOnExperimentSelected(e);
    protected handleContextMenuEvent = (e: React.MouseEvent<HTMLDivElement>, traceUUID: string): void => this.doHandleContextMenuEvent(e, traceUUID);
    protected handleDoubleClickEvent = (e: React.MouseEvent<HTMLDivElement>, traceUUID: string): void => this.doHandleDoubleClickEvent(e, traceUUID);

    protected doHandleOnExperimentSelected(e: React.MouseEvent<HTMLDivElement>): void {
        const index = Number(e.currentTarget.getAttribute('data-id'));
        signalManager().fireExperimentSelectedSignal(this._openedExperiments[index]);
        this.selectExperiment(index);
    }

    protected selectExperiment(index: number): void {
        if (index >= 0 && index !== this._selectedExperimentIndex) {
            this._selectedExperimentIndex = index;
            this.selectedExperiment = this._openedExperiments[index];
            this.updateAvailableViews(this.selectedExperiment);
        }
    }

    protected updateAvailableViews = async (experiment: Experiment | undefined): Promise<void> => this.doUpdateAvailableViews(experiment);

    protected async doUpdateAvailableViews(experiment: Experiment | undefined): Promise<void> {
        let outputs: OutputDescriptor[] | undefined;
        let signalExperiment: Experiment | undefined = experiment;
        if (signalExperiment) {
            outputs = await this.getOutputDescriptors(signalExperiment);
            this._availableOutputDescriptors.set(signalExperiment.UUID, outputs);
        } else {
            if (this._openedExperiments.length) {
                signalExperiment = this._openedExperiments[0];
                outputs = await this.getOutputDescriptors(signalExperiment);
                this._availableOutputDescriptors.set(signalExperiment.UUID, outputs);
            }
        }
        if (outputs !== undefined && signalExperiment !== undefined) {
            signalManager().fireAvailableOutputsChangedSignal(new AvailableAnalysesChangedSignalPayload(outputs, signalExperiment));
        }
        this.update();
    }

    protected async getOutputDescriptors(experiment: Experiment): Promise<OutputDescriptor[]> {
        const outputDescriptors: OutputDescriptor[] = [];
        const descriptors = await this.experimentManager.getAvailableOutputs(experiment.UUID);
        if (descriptors && descriptors.length) {
            outputDescriptors.push(...descriptors);
        }
        return outputDescriptors;
    }

    protected handleShareModalClose = (): void => this.doHandleShareModalClose();

    protected doHandleShareModalClose(): void {
        this.showShareDialog = false;
        this.sharingLink = '';
        this.update();
    }

    protected onResize(msg: Widget.ResizeMessage): void {
        super.onResize(msg);
        this.update();
    }

    protected onUpdateRequest(msg: Message): void {
        super.onUpdateRequest(msg);
        signalManager().fireOpenedTracesChangedSignal();
    }

    protected async onAfterShow(msg: Message): Promise<void> {
        super.onAfterShow(msg);
        await this.updateOpenedExperiments();
    }
}
