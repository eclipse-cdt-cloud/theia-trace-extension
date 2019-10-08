import { injectable, inject } from 'inversify';
import { ReactWidget } from '@theia/core/lib/browser/widgets/react-widget';
import * as React from 'react';
import { TraceManager } from '../../common/trace-manager';
import { Trace } from 'tsp-typescript-client/lib/models/trace';
import { List, ListRowProps } from 'react-virtualized';
import { OutputDescriptor } from 'tsp-typescript-client/lib/models/output-descriptor';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faShareSquare, faCopy } from '@fortawesome/free-solid-svg-icons'
import * as ReactModal from 'react-modal';
import { Emitter } from '@theia/core';
import { SignalManager } from '../../common/signal-manager';
import { EditorManager, EditorOpenerOptions } from '@theia/editor/lib/browser';
import URI from '@theia/core/lib/common/uri';

export const TRACE_EXPLORER_ID = 'trace-explorer';
export const TRACE_EXPLORER_LABEL = 'Trace Explorer';

export class OutputAddedSignalPayload {
    private outputDescriptor: OutputDescriptor;
    private trace: Trace;

    constructor(outputDescriptor: OutputDescriptor, trace: Trace) {
        this.outputDescriptor = outputDescriptor;
        this.trace = trace;
    }

    public getOutputDescriptor(): OutputDescriptor {
        return this.outputDescriptor;
    }

    public getTrace(): Trace {
        return this.trace;
    }
}

@injectable()
export class TraceExplorerWidget extends ReactWidget {
    private OPENED_TRACE_TITLE: string = 'Opened traces';
    // private FILE_NAVIGATOR_TITLE: string = 'File navigator';
    private ANALYSIS_TITLE: string = 'Available analysis';

    private openedTraces: Array<Trace> = new Array();
    private selectedTraceIndex: number = 0;
    private availableOutputDescriptors: Map<string, OutputDescriptor[]> = new Map();

    private showShareDialog: boolean = false;
    private sharingLink: string = '';

    private tooltip: { [key: string]: string } = {};

    // Open output
    private static outputAddedEmitter = new Emitter<OutputAddedSignalPayload>();
    public static outputAddedSignal = TraceExplorerWidget.outputAddedEmitter.event;

    constructor(
        @inject(TraceManager) private traceManager: TraceManager,
        @inject(EditorManager) protected readonly editorManager: EditorManager
    ) {
        super();
        this.id = TRACE_EXPLORER_ID;
        this.title.label = TRACE_EXPLORER_LABEL;
        this.title.caption = TRACE_EXPLORER_LABEL;
        this.title.iconClass = 'trace-explorer-tab-icon';
        this.toDispose.push(traceManager.traceOpenedSignal(trace => this.onTraceOpened(trace)));
        this.toDispose.push(traceManager.traceClosedSignal(trace => this.onTraceClosed(trace)));
        this.toDispose.push(SignalManager.getInstance().tooltipSignal(tooltip => this.onTooltip(tooltip)));
        this.initialize();
    }

    private onTraceOpened(openedTrace: Trace) {
        this.updateOpenedTraces();
        this.updateAvailableAnalysis(openedTrace);
    }

    private onTraceClosed(closedTrace: Trace) {
        this.tooltip = {};
        this.updateOpenedTraces();
        this.updateAvailableAnalysis(undefined);
    }

    private onTooltip(tooltip: { [key: string]: string }) {
        this.tooltip = tooltip;
        this.update();
    }

    async initialize(): Promise<void> {
        this.updateOpenedTraces();
        this.updateAvailableAnalysis(undefined);
    }

    protected render(): React.ReactNode {
        this.updateOpenedTraces = this.updateOpenedTraces.bind(this);
        this.updateAvailableAnalysis = this.updateAvailableAnalysis.bind(this);
        this.traceRowRenderer = this.traceRowRenderer.bind(this);
        this.outputsRowRenderer = this.outputsRowRenderer.bind(this);
        this.handleShareModalClose = this.handleShareModalClose.bind(this);

        let outputsRowCount = 0;
        if (this.openedTraces.length) {
            const outputs = this.availableOutputDescriptors.get(this.openedTraces[this.selectedTraceIndex].UUID);
            if (outputs) {
                outputsRowCount = outputs.length;
            }
        }

        return <div className='trace-explorer-container'>
            <ReactModal isOpen={this.showShareDialog} onRequestClose={this.handleShareModalClose} ariaHideApp={false} className='sharing-modal' overlayClassName='sharing-overlay'>
                {this.renderSharingModal()}
            </ReactModal>
            <div className='trace-explorer-opened'>
                <div className='trace-explorer-panel-title' onClick={this.updateOpenedTraces}>
                    {this.OPENED_TRACE_TITLE}
                </div>
                <div className='trace-explorer-panel-content'>
                    <List
                        height={300}
                        width={300}
                        rowCount={this.openedTraces.length}
                        rowHeight={50}
                        rowRenderer={this.traceRowRenderer} />
                </div>
            </div>
            {/* <div className='trace-explorer-files'>
                <div className='trace-explorer-panel-title'>
                    {this.FILE_NAVIGATOR_TITLE}
                </div>
                <div className='trace-explorer-panel-content'>
                    {'List of files'}
                </div>
            </div> */}
            <div className='trace-explorer-analysis'>
                <div className='trace-explorer-panel-title'>
                    {this.ANALYSIS_TITLE}
                </div>
                <div className='trace-explorer-panel-content'>
                    <List
                        height={300}
                        width={300}
                        rowCount={outputsRowCount}
                        rowHeight={50}
                        rowRenderer={this.outputsRowRenderer} />
                </div>
            </div>
            <div className='trace-explorer-tooltip'>
                <div className='trace-explorer-panel-title'>
                    {'Time Graph Tooltip'}
                </div>
                <div className='trace-explorer-panel-content'>
                    {this.renderTooltip()}
                </div>
            </div>
        </div>;
    }

    private renderTooltip() {
        this.handleSourcecodeLockup = this.handleSourcecodeLockup.bind(this);
        const tooltipArray: any[] = [];
        if (this.tooltip) {
            const keys = Object.keys(this.tooltip);
            keys.forEach(key => {
                if (key === 'Source') {
                    const sourceCodeInfo = this.tooltip[key];
                    const matches = sourceCodeInfo.match('(.*):(\\d+)')
                    let fileLocation;
                    let line;
                    if(matches && matches.length === 3) {
                        fileLocation = matches[1];
                        line = matches[2];
                    } 
                    tooltipArray.push(<p className='source-code-tooltip' key={key} onClick={this.handleSourcecodeLockup.bind(this, fileLocation, line)}>{key + ': ' + sourceCodeInfo}</p>);
                } else {
                    tooltipArray.push(<p key={key}>{key + ': ' + this.tooltip[key]}</p>);
                }
            });
        }

        return <React.Fragment>
            {tooltipArray.map(element => {
                return element;
            })}
        </React.Fragment>;
    }

    private handleSourcecodeLockup(fileLocation: string | undefined, line: string | undefined) {
        if (fileLocation) {
            const modeOpt: EditorOpenerOptions = {
                mode: 'open'
            };
            let slectionOpt = {
                selection: {
                    start: {
                        line: 0,
                        character: 0
                    },
                    end: {
                        line: 0,
                        character: 0
                    }
                }
            };
            if (line) {
                const lineNumber = parseInt(line);
                slectionOpt = {
                    selection: {
                        start: {
                            line: lineNumber,
                            character: 0
                        },
                        end: {
                            line: lineNumber,
                            character: 0
                        }
                    }
                };
            }
            const opts = {
                ...modeOpt,
                ...slectionOpt
            }
            this.editorManager.open(new URI(fileLocation), opts);
        }
    }

    private renderSharingModal() {
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
            </div>
        }
        return <div style={{ color: 'white' }}>
            {'Cannot share this trace'}
        </div>
    }

    private traceRowRenderer(props: ListRowProps): React.ReactNode {
        let traceName = '';
        let tracePath = '';
        if (this.openedTraces && this.openedTraces.length && props.index < this.openedTraces.length) {
            traceName = this.openedTraces[props.index].name;
            tracePath = this.openedTraces[props.index].path;
        }
        this.handleShareButtonClick = this.handleShareButtonClick.bind(this);
        return <div className='trace-list-container' key={props.key} style={props.style}>
            <div className='trace-element-container'>
                <div className='trace-element-info' onClick={this.onTraceSelected.bind(this, props.index)}>
                    <div className='trace-element-name'>
                        {traceName}
                    </div>
                    <div className='trace-element-path'>
                        {tracePath}
                    </div>
                </div>
                <div className='trace-element-options'>
                    <button className='share-context-button' onClick={this.handleShareButtonClick.bind(this, props.index)}>
                        <FontAwesomeIcon icon={faShareSquare} />
                    </button>
                </div>
            </div>
        </div>;
    }

    private onTraceSelected(index: number) {
        this.selectedTraceIndex = index;
        this.updateAvailableAnalysis(this.openedTraces[index]);
    }

    private handleShareButtonClick(index: number) {
        const traceToShare = this.openedTraces[index];
        this.sharingLink = 'https://localhost:3000/share/trace?' + traceToShare.UUID;
        this.showShareDialog = true;
        this.update();
    }

    private handleShareModalClose() {
        this.showShareDialog = false;
        this.sharingLink = '';
        this.update();
    }

    private outputsRowRenderer(props: ListRowProps): React.ReactNode {
        let outputName = '';
        let outputDescription = '';
        const selectedTrace = this.openedTraces[this.selectedTraceIndex];
        if (selectedTrace) {
            const outputDescriptors = this.availableOutputDescriptors.get(selectedTrace.UUID);
            if (outputDescriptors && outputDescriptors.length && props.index < outputDescriptors.length) {
                outputName = outputDescriptors[props.index].name;
                outputDescription = outputDescriptors[props.index].description;
            }
        }
        return <div className='outputs-list-container' key={props.key} style={props.style} onClick={this.outputClicked.bind(this, props.index)}>
            <div className='outputs-element-name'>
                {outputName}
            </div>
            <div className='outputs-element-description'>
                {outputDescription}
            </div>
        </div>;
    }

    private outputClicked(index: number) {
        const trace = this.openedTraces[this.selectedTraceIndex]
        const outputs = this.availableOutputDescriptors.get(trace.UUID);
        if (outputs) {
            TraceExplorerWidget.outputAddedEmitter.fire(new OutputAddedSignalPayload(outputs[index], trace));
        }
    }

    private async updateOpenedTraces() {
        this.openedTraces = await this.traceManager.getOpenedTraces();
        this.selectedTraceIndex = 0;
        this.update();
    }

    private async updateAvailableAnalysis(trace: Trace | undefined) {
        if (trace) {
            const outputs = await this.getOutputDescriptors(trace);
            this.availableOutputDescriptors.set(trace.UUID, outputs);
        } else {
            if (this.openedTraces.length) {
                const outputs = await this.getOutputDescriptors(this.openedTraces[0])
                this.availableOutputDescriptors.set(this.openedTraces[0].UUID, outputs);
            }
        }

        this.update();
    }

    private async getOutputDescriptors(trace: Trace): Promise<OutputDescriptor[]> {
        const outputDescriptors: OutputDescriptor[] = new Array();
        const descriptors = await this.traceManager.getAvailableOutputs(trace.UUID);
        if (descriptors && descriptors.length) {
            outputDescriptors.push(...descriptors);
        }
        return outputDescriptors;
    }
}