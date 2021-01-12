import { inject, injectable, postConstruct } from 'inversify';
import { ReactWidget, Message, Widget } from '@theia/core/lib/browser';
import * as React from 'react';
import { List, ListRowProps, Index, AutoSizer } from 'react-virtualized';
import { Experiment } from 'tsp-typescript-client/lib/models/experiment';
import { ExperimentManager } from '@trace-viewer/base/lib/experiment-manager';
import { OutputDescriptor } from 'tsp-typescript-client/lib/models/output-descriptor';
import { Emitter } from '@theia/core';
import { TspClientProvider } from '../../tsp-client-provider';
import { signalManager, Signals } from '@trace-viewer/base/lib/signal-manager';
import { TraceExplorerTooltipWidget } from './trace-explorer-tooltip-widget';
import ReactModal from 'react-modal';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCopy } from '@fortawesome/free-solid-svg-icons';

@injectable()
export class TraceExplorerOpenedTracesWidget extends ReactWidget {
    static ID = 'trace-explorer-opened-traces-widget';
    static LABEL = 'Opened Traces';
    static LIST_MARGIN = 2;
    static LINE_HEIGHT = 16;

    protected forceUpdateKey = false;

    protected experimentSelectedEmitter = new Emitter<Experiment>();
    experimentSelectedSignal = this.experimentSelectedEmitter.event;

    protected availableOutputDescriptorsEmitter = new Emitter<Map<string, OutputDescriptor[]>>();
    availableOutputDescriptorsDidChange = this.availableOutputDescriptorsEmitter.event;

    @inject(TspClientProvider) protected readonly tspClientProvider!: TspClientProvider;
    @inject(TraceExplorerTooltipWidget) protected readonly tooltipWidget!: TraceExplorerTooltipWidget;

    protected readonly updateRequestEmitter = new Emitter<void>();
    widgetWasUpdated = this.updateRequestEmitter.event;

    sharingLink = '';
    showShareDialog = false;
    lastSelectedOutputIndex = -1;

    protected _openedExperiments: Array<Experiment> = [];
    get openedExperiments(): Array<Experiment> {
        return this._openedExperiments;
    }

    protected _selectedExperimentIndex = 0;
    get selectedExperimentIndex(): number {
        return this._selectedExperimentIndex;
    }
    protected _availableOutputDescriptors: Map<string, OutputDescriptor[]> = new Map();
    get availableOutputDescriptors(): Map<string, OutputDescriptor[]> {
        return this._availableOutputDescriptors;
    }
    protected experimentManager!: ExperimentManager;
    protected selectedExperiment: Experiment | undefined;

    @postConstruct()
    async init(): Promise<void> {
        this.id = TraceExplorerOpenedTracesWidget.ID;
        this.title.label = TraceExplorerOpenedTracesWidget.LABEL;

        signalManager().on(Signals.EXPERIMENT_OPENED, ({ experiment }) => this.onExperimentOpened(experiment));
        signalManager().on(Signals.EXPERIMENT_CLOSED, ({ experiment }) => this.onExperimentClosed(experiment));
        signalManager().on(Signals.EXPERIMENT_SELECTED, ({ experiment }) => this.onWidgetActivated(experiment));

        this.experimentManager = this.tspClientProvider.getExperimentManager();
        this.tspClientProvider.addTspClientChangeListener(() => {
            this.experimentManager = this.tspClientProvider.getExperimentManager();
        });

        this.toDispose.pushAll([this.experimentSelectedEmitter, this.availableOutputDescriptorsEmitter]);

        await this.initialize();
        this.update();
    }

    dispose(): void {
        super.dispose();
        signalManager().off(Signals.EXPERIMENT_OPENED, ({ experiment }) => this.onExperimentOpened(experiment));
        signalManager().off(Signals.EXPERIMENT_CLOSED, ({ experiment }) => this.onExperimentClosed(experiment));
        signalManager().off(Signals.EXPERIMENT_SELECTED, ({ experiment }) => this.onWidgetActivated(experiment));
    }

    async initialize(): Promise<void> {
        await this.updateOpenedExperiments();
        await this.updateAvailableAnalysis(undefined);
    }

    protected async onExperimentOpened(openedExperiment: Experiment): Promise<void> {
        await this.updateOpenedExperiments();
        await this.updateAvailableAnalysis(openedExperiment);
    }

    protected async onExperimentClosed(_closedExperiment: Experiment): Promise<void> {
        this.tooltipWidget.tooltip = {};
        await this.updateOpenedExperiments();
        await this.updateAvailableAnalysis(undefined);
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
        let traceContainerClassName = 'trace-list-container';
        if (props.index === this._selectedExperimentIndex) {
            traceContainerClassName = traceContainerClassName + ' theia-mod-selected';
        }
        return <div className={traceContainerClassName}
            id={`${traceContainerClassName}-${props.index}`}
            key={props.key}
            style={props.style}
            onClick={this.handleOnExperimentSelected}
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

    protected doHandleOnExperimentSelected(e: React.MouseEvent<HTMLDivElement>): void {
        const index = Number(e.currentTarget.getAttribute('data-id'));
        this.experimentSelectedEmitter.fire(this._openedExperiments[index]);
        this.selectExperiment(index);
    }

    protected selectExperiment(index: number): void {
        if (index >= 0 && index !== this._selectedExperimentIndex) {
            this._selectedExperimentIndex = index;
            this.lastSelectedOutputIndex = -1;
            this.updateAvailableAnalysis(this._openedExperiments[index]);
        }
    }

    protected updateAvailableAnalysis = async (experiment: Experiment | undefined): Promise<void> => this.doUpdateAvailableAnalysis(experiment);

    protected async doUpdateAvailableAnalysis(experiment: Experiment | undefined): Promise<void> {
        if (experiment) {
            const outputs = await this.getOutputDescriptors(experiment);
            this._availableOutputDescriptors.set(experiment.UUID, outputs);
        } else {
            if (this._openedExperiments.length) {
                const outputs = await this.getOutputDescriptors(this._openedExperiments[0]);
                this._availableOutputDescriptors.set(this._openedExperiments[0].UUID, outputs);
            }
        }
        this.availableOutputDescriptorsEmitter.fire(this._availableOutputDescriptors);
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

    onWidgetActivated(experiment: Experiment): void {
        this.selectedExperiment = experiment;
        const selectedIndex = this._openedExperiments.findIndex(openedExperiment => openedExperiment.UUID === experiment.UUID);
        this.selectExperiment(selectedIndex);
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
        this.updateRequestEmitter.fire();
    }

    protected async onAfterShow(msg: Message): Promise<void> {
        super.onAfterShow(msg);
        await this.updateOpenedExperiments();
    }
}
