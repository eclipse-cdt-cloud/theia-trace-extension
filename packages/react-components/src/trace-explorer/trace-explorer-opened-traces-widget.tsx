import * as React from 'react';
import { List, ListRowProps, Index, AutoSizer } from 'react-virtualized';
import { Experiment } from 'tsp-typescript-client/lib/models/experiment';
import { ExperimentManager } from '@trace-viewer/base/lib/experiment-manager';
import { OutputDescriptor } from 'tsp-typescript-client/lib/models/output-descriptor';
import { signalManager, Signals } from '@trace-viewer/base/lib/signals/signal-manager';
import ReactModal from 'react-modal';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCopy } from '@fortawesome/free-solid-svg-icons';
import { AvailableViewsChangedSignalPayload } from '@trace-viewer/base/lib/signals/available-views-changed-signal-payload';
import { OpenedTracesUpdatedSignalPayload } from '@trace-viewer/base/lib/signals/opened-traces-updated-signal-payload';
import { ITspClientProvider } from '@trace-viewer/base/lib/tsp-client-provider';

export interface ReactOpenTracesWidgetProps {
    id: string,
    title: string,
    tspClientProvider: ITspClientProvider,
    contextMenuRenderer?: (event: React.MouseEvent<HTMLDivElement>, experiment: Experiment) => void,
    onDoubleClick?: (event: React.MouseEvent<HTMLDivElement>, experiment: Experiment) => void
}

export interface ReactOpenTracesWidgetState {
    openedExperiments: Array<Experiment>
}

export class ReactOpenTracesWidget extends React.Component<ReactOpenTracesWidgetProps, ReactOpenTracesWidgetState> {
    static LIST_MARGIN = 2;
    static LINE_HEIGHT = 16;

    protected forceUpdateKey = false;

    sharingLink = '';
    showShareDialog = false;
    lastSelectedOutputIndex = -1;

    private _selectedExperimentIndex = 0;
    private _availableOutputDescriptors: Map<string, OutputDescriptor[]> = new Map();
    private _selectedExperiment: Experiment | undefined;
    private _experimentManager: ExperimentManager;

    private _onExperimentOpened = (openedExperiment: Experiment): Promise<void> => this.doHandleExperimentOpenedSignal(openedExperiment);
    private _onExperimentClosed = (closedExperiment: Experiment): Promise<void> => this.doHandleExperimentClosedSignal(closedExperiment);
    private _onOpenedTracesWidgetActivated = (experiment: Experiment): void => this.doHandleTracesWidgetActivatedSignal(experiment);

    constructor(props: ReactOpenTracesWidgetProps) {
        super(props);
        signalManager().on(Signals.EXPERIMENT_OPENED, this._onExperimentOpened);
        signalManager().on(Signals.EXPERIMENT_CLOSED, this._onExperimentClosed);
        signalManager().on(Signals.TRACEVIEWERTAB_ACTIVATED, this._onOpenedTracesWidgetActivated);

        this._experimentManager = this.props.tspClientProvider.getExperimentManager();
        this.props.tspClientProvider.addTspClientChangeListener(() => {
            this._experimentManager = this.props.tspClientProvider.getExperimentManager();
        });
        this.state = { openedExperiments: [] };
    }

    componentDidMount(): void {
        this.initialize();
    }

    componentWillUnmount(): void {
        signalManager().off(Signals.EXPERIMENT_OPENED, this._onExperimentOpened);
        signalManager().off(Signals.EXPERIMENT_CLOSED, this._onExperimentClosed);
        signalManager().off(Signals.TRACEVIEWERTAB_ACTIVATED, this._onOpenedTracesWidgetActivated);
    }

    async initialize(): Promise<void> {
        await this.updateOpenedExperiments();
        await this.updateAvailableAnalysis(undefined);
    }

    public async doHandleExperimentOpenedSignal(openedExperiment: Experiment): Promise<void> {
        await this.updateOpenedExperiments();
        await this.updateAvailableAnalysis(openedExperiment);
    }

    public async doHandleExperimentClosedSignal(_closedExperiment: Experiment): Promise<void> {
        await this.updateOpenedExperiments();
        await this.updateAvailableAnalysis(undefined);
    }

    protected doHandleTracesWidgetActivatedSignal(experiment: Experiment): void {
        this._selectedExperiment = experiment;
        const selectedIndex = this.state.openedExperiments.findIndex(openedExperiment => openedExperiment.UUID === experiment.UUID);
        this.selectExperiment(selectedIndex);
    }

    protected doHandleContextMenuEvent(event: React.MouseEvent<HTMLDivElement>, traceUUID: string): void {
        this.doHandleOnExperimentSelected(event);
        const experiment = this.getExperiment(traceUUID);
        if (experiment !== undefined && this.props.contextMenuRenderer) {
            this.props.contextMenuRenderer(event, experiment);
        }
        event.preventDefault();
        event.stopPropagation();
    }

    protected dohandleDoubleClickEvent(event: React.MouseEvent<HTMLDivElement>, traceUUID: string): void {
        this.doHandleOnExperimentSelected(event);
        const experiment = this.getExperiment(traceUUID);
        if (experiment !== undefined && this.props.onDoubleClick) {
            this.props.onDoubleClick(event, experiment);
        }
        event.preventDefault();
        event.stopPropagation();
    }

    public getExperiment(traceUUID: string): Experiment | undefined {
        return this.state.openedExperiments.find(experiment => experiment.UUID === traceUUID);
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
                                    rowCount={this.state.openedExperiments.length}
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
        const traceName = this.state.openedExperiments.length && props.index < this.state.openedExperiments.length
            ? this.state.openedExperiments[props.index].name : '';
        const traceUUID = this.state.openedExperiments.length && props.index < this.state.openedExperiments.length
            ? this.state.openedExperiments[props.index].UUID : '';
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
        const tracePaths = this.state.openedExperiments[index].traces;
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
        const experiment = this.state.openedExperiments[resolvedIndex];
        let totalHeight = 0;
        if (experiment.name) {
            totalHeight += ReactOpenTracesWidget.LINE_HEIGHT;
        }
        for (let i = 0; i < experiment.traces.length; i++) {
            totalHeight += ReactOpenTracesWidget.LINE_HEIGHT;
        }
        return totalHeight;
    }

    protected getTotalHeight(): number {
        let totalHeight = 0;
        for (let i = 0; i < this.state.openedExperiments.length; i++) {
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
        const remoteExperiments = await this._experimentManager.getOpenedExperiments();
        remoteExperiments.forEach(experiment => {
            this._experimentManager.addExperiment(experiment);
        });
        const selectedIndex = remoteExperiments.findIndex(experiment => this._selectedExperiment &&
            experiment.UUID === this._selectedExperiment.UUID);
        this._selectedExperimentIndex = selectedIndex !== -1 ? selectedIndex : 0;
        this.setState({ openedExperiments: remoteExperiments });
        signalManager().fireOpenedTracesChangedSignal(new OpenedTracesUpdatedSignalPayload(remoteExperiments ? remoteExperiments.length : 0));
    }

    protected handleShareButtonClick = (index: number): void => this.doHandleShareButtonClick(index);

    protected doHandleShareButtonClick(index: number): void {
        const traceToShare = this.state.openedExperiments[index];
        this.sharingLink = 'https://localhost:3000/share/trace?' + traceToShare.UUID;
        this.showShareDialog = true;
        signalManager().fireOpenedTracesChangedSignal(new OpenedTracesUpdatedSignalPayload(this.state.openedExperiments ? this.state.openedExperiments.length : 0));
    }

    protected handleOnExperimentSelected = (e: React.MouseEvent<HTMLDivElement>): void => this.doHandleOnExperimentSelected(e);
    protected handleContextMenuEvent = (e: React.MouseEvent<HTMLDivElement>, traceUUID: string): void => this.doHandleContextMenuEvent(e, traceUUID);
    protected handleDoubleClickEvent = (e: React.MouseEvent<HTMLDivElement>, traceUUID: string): void => this.dohandleDoubleClickEvent(e, traceUUID);

    protected doHandleOnExperimentSelected(e: React.MouseEvent<HTMLDivElement>): void {
        const index = Number(e.currentTarget.getAttribute('data-id'));
        const exp = this.state.openedExperiments[index];
        signalManager().fireExperimentSelectedSignal(exp);
        this.selectExperiment(index);
    }

    protected selectExperiment(index: number): void {
        if (index >= 0 && index !== this._selectedExperimentIndex) {
            this._selectedExperimentIndex = index;
            this._selectedExperiment = this.state.openedExperiments[index];
            this.lastSelectedOutputIndex = -1;
            this.updateAvailableAnalysis(this.state.openedExperiments[index]);
        }
    }

    protected updateAvailableAnalysis = async (experiment: Experiment | undefined): Promise<void> => this.doUpdateAvailableAnalysis(experiment);

    protected async doUpdateAvailableAnalysis(experiment: Experiment | undefined): Promise<void> {
        let outputs: OutputDescriptor[] | undefined;
        let signalExperiment: Experiment | undefined = experiment;
        if (signalExperiment) {
            outputs = await this.getOutputDescriptors(signalExperiment);
            this._availableOutputDescriptors.set(signalExperiment.UUID, outputs);
        } else {
            if (this.state.openedExperiments.length) {
                signalExperiment = this.state.openedExperiments[0];
                outputs = await this.getOutputDescriptors(signalExperiment);
                this._availableOutputDescriptors.set(signalExperiment.UUID, outputs);
            }
        }
        if (outputs !== undefined && signalExperiment !== undefined) {
            signalManager().fireAvailableOutputsChangedSignal(new AvailableViewsChangedSignalPayload(outputs, signalExperiment));
        }
    }

    protected async getOutputDescriptors(experiment: Experiment): Promise<OutputDescriptor[]> {
        const outputDescriptors: OutputDescriptor[] = [];
        const descriptors = await this._experimentManager.getAvailableOutputs(experiment.UUID);
        if (descriptors && descriptors.length) {
            outputDescriptors.push(...descriptors);
        }
        return outputDescriptors;
    }

    onWidgetActivated(experiment: Experiment): void {
        if (experiment) {
            this._selectedExperiment = experiment;
            const selectedIndex = this.state.openedExperiments.findIndex(openedExperiment => openedExperiment.UUID === experiment.UUID);
            this.selectExperiment(selectedIndex);
        }
    }

    protected handleShareModalClose = (): void => this.doHandleShareModalClose();

    protected doHandleShareModalClose(): void {
        this.showShareDialog = false;
        this.sharingLink = '';
        signalManager().fireOpenedTracesChangedSignal(new OpenedTracesUpdatedSignalPayload(this.state.openedExperiments ? this.state.openedExperiments.length : 0));
    }
}
