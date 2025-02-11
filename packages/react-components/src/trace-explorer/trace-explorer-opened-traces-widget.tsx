import * as React from 'react';
import { flushSync } from 'react-dom';
import { List, ListRowProps, Index, AutoSizer } from 'react-virtualized';
import { Experiment } from 'tsp-typescript-client/lib/models/experiment';
import { ExperimentManager } from 'traceviewer-base/lib/experiment-manager';
import { signalManager } from 'traceviewer-base/lib/signals/signal-manager';
import ReactModal from 'react-modal';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCopy } from '@fortawesome/free-solid-svg-icons';
import { OpenedTracesUpdatedSignalPayload } from 'traceviewer-base/lib/signals/opened-traces-updated-signal-payload';
import { ITspClientProvider } from 'traceviewer-base/lib/tsp-client-provider';
import { faTimes } from '@fortawesome/free-solid-svg-icons';

export interface ReactOpenTracesWidgetProps {
    id: string;
    title: string;
    tspClientProvider: ITspClientProvider;
    contextMenuRenderer?: (event: React.MouseEvent<HTMLDivElement>, experiment: Experiment) => void;
    onClick?: (event: React.MouseEvent<HTMLDivElement>, experiment: Experiment) => void;
}

export interface ReactOpenTracesWidgetState {
    openedExperiments: Array<Experiment>;
    selectedExperimentIndex: number;
    filter: string;
}

export class ReactOpenTracesWidget extends React.Component<ReactOpenTracesWidgetProps, ReactOpenTracesWidgetState> {
    static LIST_MARGIN = 2;
    static LINE_HEIGHT = 16;

    private _forceUpdateKey = false;

    private _sharingLink = '';
    private _showShareDialog = false;

    private _selectedExperiment: Experiment | undefined;
    private _experimentManager: ExperimentManager;

    constructor(props: ReactOpenTracesWidgetProps) {
        super(props);
        signalManager().on('EXPERIMENT_OPENED', this.handleExperimentOpenedSignal);
        signalManager().on('EXPERIMENT_CLOSED', this.handleExperimentClosedSignal);
        signalManager().on('EXPERIMENT_DELETED', this.handleExperimentDeletedSignal);
        signalManager().on('TRACEVIEWERTAB_ACTIVATED', this.handleTracesWidgetActivatedSignal);
        signalManager().on('TRACE_SERVER_STARTED', this.handleTraceServerStartedSignal);

        this._experimentManager = this.props.tspClientProvider.getExperimentManager();
        this.props.tspClientProvider.addTspClientChangeListener(() => {
            this._experimentManager = this.props.tspClientProvider.getExperimentManager();
        });
        this.state = { openedExperiments: [], selectedExperimentIndex: -1, filter: '' };
    }

    componentDidMount(): void {
        this.initialize();
    }

    componentWillUnmount(): void {
        signalManager().off('EXPERIMENT_OPENED', this.handleExperimentOpenedSignal);
        signalManager().off('EXPERIMENT_CLOSED', this.handleExperimentClosedSignal);
        signalManager().off('EXPERIMENT_DELETED', this.handleExperimentDeletedSignal);
        signalManager().off('TRACEVIEWERTAB_ACTIVATED', this.handleTracesWidgetActivatedSignal);
        signalManager().off('TRACE_SERVER_STARTED', this.handleTraceServerStartedSignal);
    }

    async initialize(): Promise<void> {
        await this.updateOpenedExperiments();
        this.updateSelectedExperiment();
    }

    public handleTraceServerStartedSignal = async (): Promise<void> => {
        await this.initialize();
    };

    public handleExperimentOpenedSignal = async (_experiment: Experiment): Promise<void> => {
        await this.initialize();
    };

    protected handleExperimentClosedSignal = (experiment: Experiment): void => {
        if (this._selectedExperiment?.UUID === experiment.UUID) {
            this._selectedExperiment = undefined;
            this.setState({ selectedExperimentIndex: -1 });
        }
    };

    public handleExperimentDeletedSignal = async (_experiment: Experiment): Promise<void> => {
        await this.initialize();
    };

    protected handleTracesWidgetActivatedSignal = (experiment: Experiment): void => {
        if (this._selectedExperiment?.UUID !== experiment.UUID) {
            this._selectedExperiment = experiment;
            const selectedIndex = this.state.openedExperiments.findIndex(
                openedExperiment => openedExperiment.UUID === experiment.UUID
            );
            this.selectExperiment(selectedIndex);
        }
    };

    protected handleContextMenuEvent = (event: React.MouseEvent<HTMLDivElement>, traceUUID: string): void => {
        this.handleOnExperimentSelected(event);
        const experiment = this.getExperiment(traceUUID);
        if (experiment !== undefined && this.props.contextMenuRenderer) {
            this.props.contextMenuRenderer(event, experiment);
        }
        event.preventDefault();
        event.stopPropagation();
    };

    protected handleClickEvent = (event: React.MouseEvent<HTMLDivElement>, traceUUID: string): void => {
        this.handleOnExperimentSelected(event);
        const experiment = this.getExperiment(traceUUID);
        if (experiment !== undefined && this.props.onClick) {
            this.props.onClick(event, experiment);
        }
        event.preventDefault();
        event.stopPropagation();
    };

    private getExperiment(traceUUID: string): Experiment | undefined {
        return this.state.openedExperiments.find(experiment => experiment.UUID === traceUUID);
    }

    render(): React.ReactNode {
        const totalHeight = this.getTotalHeight();
        this._forceUpdateKey = !this._forceUpdateKey;
        const key = Number(this._forceUpdateKey);
        return (
            <>
                <ReactModal
                    isOpen={this._showShareDialog}
                    onRequestClose={this.handleShareModalClose}
                    ariaHideApp={false}
                    className="sharing-modal"
                    overlayClassName="sharing-overlay"
                >
                    {this.renderSharingModal()}
                </ReactModal>
                <div className="trace-explorer-opened">
                    <div className="trace-explorer-panel-content" onClick={this.updateOpenedExperiments}>
                        <React.Fragment>
                            {this.renderFilter()}
                            <AutoSizer>
                                {({ width }) => (
                                    <List
                                        key={key}
                                        height={totalHeight}
                                        width={width}
                                        rowCount={this.state.openedExperiments.length}
                                        rowHeight={this.getRowHeight}
                                        rowRenderer={this.renderExperimentRow}
                                    />
                                )}
                            </AutoSizer>
                        </React.Fragment>
                    </div>
                </div>
            </>
        );
    }

    renderFilter(): JSX.Element {
        const onChange = (e: React.ChangeEvent<HTMLInputElement>) => this.setState({ filter: e.target.value });
        return (
            <div ref={React.createRef()} onChange={onChange} id="input-filter-container">
                <i id="input-filter-icon" className="codicon codicon-filter"></i>
                <input id="input-filter-text" type="text" placeholder="Filter" style={{ width: '100%' }} />
            </div>
        );
    }

    isVisible = (experiment: Experiment): boolean => {
        if (this.state.filter) {
            if (experiment.name.includes(this.state.filter)) {
                return true;
            }
            if (experiment.traces.find(trace => trace.name.includes(this.state.filter))) {
                return true;
            }
            return false;
        }
        return true;
    };

    /*
        TODO: Implement better visualization of experiment, e.g. a tree
        with experiment name as root and traces (name and path) as children
     */
    protected renderExperimentRow = (props: ListRowProps): React.ReactNode => {
        const experiment =
            this.state.openedExperiments.length && props.index < this.state.openedExperiments.length
                ? this.state.openedExperiments[props.index]
                : undefined;
        if (!experiment) {
            return undefined;
        }
        if (!this.isVisible(experiment)) {
            return undefined;
        }
        const traceUUID = experiment.UUID;
        let traceContainerClassName = 'trace-list-container';
        if (props.index === this.state.selectedExperimentIndex && this.state.selectedExperimentIndex >= 0) {
            traceContainerClassName = traceContainerClassName + ' theia-mod-selected';
        }
        return (
            <div
                className={traceContainerClassName}
                id={`${traceContainerClassName}-${props.index}`}
                key={props.key}
                style={props.style}
                onClick={event => {
                    this.handleClickEvent(event, traceUUID);
                }}
                onContextMenu={event => {
                    this.handleContextMenuEvent(event, traceUUID);
                }}
                data-id={`${props.index}`}
            >
                <div className="trace-element-container">
                    <div className="trace-element-info">
                        <h4 className="trace-element-name">{experiment.name}</h4>
                        {this.renderTracesForExperiment(experiment)}
                    </div>
                    <div className="remove-trace-button-container" title="Remove trace from Trace Viewer">
                        <button
                            data-tip
                            data-for="removeTip"
                            className="remove-trace-button"
                            onClick={event => {
                                this.handleOnExperimentDeleted(event, traceUUID);
                            }}
                        >
                            <FontAwesomeIcon icon={faTimes} />
                        </button>
                    </div>
                    {/* <div className='trace-element-options'>
                    <button className='share-context-button' onClick={this.handleShareButtonClick.bind(this, props.index)}>
                        <FontAwesomeIcon icon={faShareSquare} />
                    </button>
                </div> */}
                </div>
            </div>
        );
    };

    protected handleOnExperimentDeleted = (e: React.MouseEvent<HTMLButtonElement>, traceUUID: string): void => {
        this._experimentManager.deleteExperiment(traceUUID);
        signalManager().emit('CLOSE_TRACEVIEWERTAB', traceUUID);
        e.preventDefault();
        e.stopPropagation();
    };

    protected renderTracesForExperiment(experiment: Experiment): React.ReactNode {
        return (
            <div className="trace-element-path-container">
                {experiment.traces.map(trace => (
                    <div
                        className="trace-element-path child-element"
                        id={trace.UUID}
                        key={trace.UUID}
                        title={trace.path}
                    >
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
        if (!this.isVisible(experiment)) {
            return 0;
        }
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
        if (this._sharingLink.length) {
            return (
                <div className="sharing-container">
                    <div className="sharing-description">{'Copy URL to share your trace context'}</div>
                    <div className="sharing-link-info">
                        <div className="sharing-link">
                            <textarea
                                rows={1}
                                cols={this._sharingLink.length}
                                readOnly={true}
                                value={this._sharingLink}
                            />
                        </div>
                        <div className="sharing-link-copy">
                            <button className="copy-link-button">
                                <FontAwesomeIcon icon={faCopy} />
                            </button>
                        </div>
                    </div>
                </div>
            );
        }
        return <div style={{ color: 'white' }}>{'Cannot share this trace'}</div>;
    }

    protected updateOpenedExperiments = async (): Promise<void> => this.doUpdateOpenedExperiments();

    protected async doUpdateOpenedExperiments(): Promise<void> {
        const remoteExperiments = await this._experimentManager.getOpenedExperiments();
        remoteExperiments.forEach(experiment => {
            this._experimentManager.addExperiment(experiment);
        });
        const selectedIndex = remoteExperiments.findIndex(
            experiment => this._selectedExperiment && experiment.UUID === this._selectedExperiment.UUID
        );
        // flushSync: force immediate state update instead of waiting for React 18's automatic batching
        flushSync(() => {
            this.setState({ openedExperiments: remoteExperiments, selectedExperimentIndex: selectedIndex });
        });
        signalManager().emit(
            'OPENED_TRACES_UPDATED',
            new OpenedTracesUpdatedSignalPayload(remoteExperiments ? remoteExperiments.length : 0)
        );
    }

    protected handleShareButtonClick = (index: number): void => {
        const traceToShare = this.state.openedExperiments[index];
        this._sharingLink = 'https://localhost:3000/share/trace?' + traceToShare.UUID;
        this._showShareDialog = true;
        signalManager().emit(
            'OPENED_TRACES_UPDATED',
            new OpenedTracesUpdatedSignalPayload(this.state.openedExperiments ? this.state.openedExperiments.length : 0)
        );
    };

    protected handleOnExperimentSelected = (e: React.MouseEvent<HTMLDivElement>): void => {
        const index = Number(e.currentTarget.getAttribute('data-id'));
        this.selectExperiment(index);
    };

    private selectExperiment(index: number): void {
        if (index >= 0 && index !== this.state.selectedExperimentIndex) {
            this.setState({ selectedExperimentIndex: index });
            this._selectedExperiment = this.state.openedExperiments[index];
            signalManager().emit('EXPERIMENT_SELECTED', this._selectedExperiment);
        }
    }

    private updateSelectedExperiment(): void {
        if (
            this.state.openedExperiments &&
            this.state.selectedExperimentIndex >= 0 &&
            this.state.selectedExperimentIndex < this.state.openedExperiments.length
        ) {
            this._selectedExperiment = this.state.openedExperiments[this.state.selectedExperimentIndex];
            signalManager().emit('EXPERIMENT_SELECTED', this._selectedExperiment);
        }
    }

    protected onWidgetActivated(experiment: Experiment): void {
        if (experiment) {
            this._selectedExperiment = experiment;
            const selectedIndex = this.state.openedExperiments.findIndex(
                openedExperiment => openedExperiment.UUID === experiment.UUID
            );
            this.selectExperiment(selectedIndex);
        }
    }

    protected handleShareModalClose = (): void => {
        this._showShareDialog = false;
        this._sharingLink = '';
        signalManager().emit(
            'OPENED_TRACES_UPDATED',
            new OpenedTracesUpdatedSignalPayload(this.state.openedExperiments ? this.state.openedExperiments.length : 0)
        );
    };
}
