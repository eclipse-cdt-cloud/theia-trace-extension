import * as React from 'react';
import { OutputDescriptor } from 'tsp-typescript-client/lib/models/output-descriptor';
import { TspClient } from 'tsp-typescript-client/lib/protocol/tsp-client';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes } from '@fortawesome/free-solid-svg-icons';
import { TimeGraphUnitController } from 'timeline-chart/lib/time-graph-unit-controller';
import { TimeRange } from 'traceviewer-base/lib/utils/time-range';
import { OutputComponentStyle } from './utils/output-component-style';
import { OutputStyleModel } from 'tsp-typescript-client/lib/models/styles';
import { TooltipComponent } from './tooltip-component';
import { TooltipXYComponent } from './tooltip-xy-component';
import { ResponseStatus } from 'tsp-typescript-client/lib/models/response/responses';

export interface AbstractOutputProps {
    tspClient: TspClient;
    tooltipComponent: TooltipComponent | null;
    tooltipXYComponent: TooltipXYComponent | null;
    traceId: string;
    range: TimeRange;
    nbEvents: number;
    viewRange: TimeRange;
    selectionRange: TimeRange | undefined;
    resolution?: number;
    outputDescriptor: OutputDescriptor;
    markerCategories: string[] | undefined;
    markerSetId: string;
    style: OutputComponentStyle;
    outputWidth: number;
    backgroundTheme: string;
    onOutputRemove: (outputId: string) => void;
    // TODO Not sure
    unitController: TimeGraphUnitController;
    onSelectionRangeChange?: () => void;
    onViewRangeChange?: () => void;
    className?: string;
    onMouseUp?: VoidFunction;
    onMouseDown?: VoidFunction;
    onTouchStart?: VoidFunction;
    onTouchEnd?: VoidFunction;
    setChartOffset?: (chartOffset: number) => void;
}

export interface AbstractOutputState {
    outputStatus: string;
    styleModel?: OutputStyleModel
}

export abstract class AbstractOutputComponent<P extends AbstractOutputProps, S extends AbstractOutputState> extends React.Component<P, S> {

    private readonly DEFAULT_HANDLE_WIDTH = 30;

    private mainOutputContainer: React.RefObject<HTMLDivElement>;

    constructor(props: P) {
        super(props);
        this.mainOutputContainer = React.createRef();
        this.closeComponent = this.closeComponent.bind(this);
        this.renderTitleBar = this.renderTitleBar.bind(this);
    }

    render(): JSX.Element {
        return <div style={{ ...this.props.style, width: this.props.outputWidth }}
            id={this.props.traceId + this.props.outputDescriptor.id}
            tabIndex={-1}
            className={'output-container ' + this.props.className}
            onMouseUp={this.props.onMouseUp}
            onMouseDown={this.props.onMouseDown}
            onTouchStart={this.props.onTouchStart}
            onTouchEnd={this.props.onTouchEnd}
            data-tip=''
            data-for="tooltip-component">
            <div
                id={this.props.traceId + this.props.outputDescriptor.id + 'handle'}
                className='widget-handle'
                style={{ width: this.getHandleWidth(), height: this.props.style.height }}
            >
                {this.renderTitleBar()}
            </div>
            <div className='main-output-container' ref={this.mainOutputContainer}
                style={{ width: this.props.outputWidth - this.getHandleWidth(), height: this.props.style.height }}>
                {this.renderMainOutputContainer()}
            </div>
            {this.props.children}
        </div>;
    }

    private renderTitleBar(): React.ReactNode {
        const outputName = this.props.outputDescriptor.name;
        return <React.Fragment>
            <button className='remove-component-button' onClick={this.closeComponent}>
                <FontAwesomeIcon icon={faTimes} />
            </button>
            <div className='title-bar-label' title={outputName} onClick={() => this.setFocus()}>
                {outputName}
            </div>
        </React.Fragment>;
    }

    private closeComponent() {
        this.props.onOutputRemove(this.props.outputDescriptor.id);
    }

    protected getHandleWidth(): number {
        return this.props.style.handleWidth || this.DEFAULT_HANDLE_WIDTH;
    }

    public getMainAreaWidth(): number {
        return this.props.outputWidth - this.getHandleWidth();
    }

    private renderMainOutputContainer(): React.ReactNode {
        if (this.state.outputStatus === ResponseStatus.FAILED) {
            return this.renderAnalysisFailed();
        }

        if (this.state.outputStatus === ResponseStatus.COMPLETED && this.resultsAreEmpty()) {
            return this.renderEmptyResults();
        }

        return this.renderMainArea();
    }
    abstract setFocus(): void;

    abstract renderMainArea(): React.ReactNode;

    abstract resultsAreEmpty(): boolean;

    protected renderAnalysisFailed(): React.ReactFragment {
        return <React.Fragment>
            <div className='message-main-area'>
                Trace analysis failed.
            </div>
        </React.Fragment>;
    }

    protected renderEmptyResults(): React.ReactFragment {
        return <React.Fragment>
                <div className='message-main-area'>
                    Trace analysis complete.
                    <br />
                    No results: Trace missing required events.
                </div>
        </React.Fragment>;
    }
}
