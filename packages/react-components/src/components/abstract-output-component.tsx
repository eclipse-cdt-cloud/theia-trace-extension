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

export interface AbstractOutputProps {
    tspClient: TspClient;
    tooltipComponent: TooltipComponent | null;
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
    // WidthProvider (react-grid-layout version 0.16.7) has a bug.
    // Workaround for it needs width to be explicitly passed
    // https://github.com/STRML/react-grid-layout/issues/961
    widthWPBugWorkaround: number;
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
}

export interface AbstractOutputState {
    outputStatus: string;
    styleModel?: OutputStyleModel
}

export abstract class AbstractOutputComponent<P extends AbstractOutputProps, S extends AbstractOutputState> extends React.Component<P, S> {

    private mainAreaContainer: React.RefObject<HTMLDivElement>;
    private readonly HANDLE_WIDTH = 30;

    constructor(props: P) {
        super(props);
        this.mainAreaContainer = React.createRef();
        this.closeComponent = this.closeComponent.bind(this);
        this.renderTitleBar = this.renderTitleBar.bind(this);
    }

    render(): JSX.Element {
        const localStyle = Object.assign({}, this.props.style);
        localStyle.width = this.props.widthWPBugWorkaround;
        return <div style={localStyle}
            id={this.props.outputDescriptor.id}
            className={'output-container ' + this.props.className}
            onMouseUp={this.props.onMouseUp}
            onMouseDown={this.props.onMouseDown}
            onTouchStart={this.props.onTouchStart}
            onTouchEnd={this.props.onTouchEnd}
            data-tip=''
            data-for="tooltip-component">
            <div className='widget-handle' style={{ width: this.HANDLE_WIDTH, height: this.props.style.height }}>
                {this.renderTitleBar()}
            </div>
            <div className='main-output-container' ref={this.mainAreaContainer}
                style={{ width: this.props.widthWPBugWorkaround - this.HANDLE_WIDTH, height: this.props.style.height }}>
                {this.renderMainArea()}
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
            <div className='title-bar-label' title={outputName}>
                {outputName}
            </div>
        </React.Fragment>;
    }

    private closeComponent() {
        this.props.onOutputRemove(this.props.outputDescriptor.id);
    }

    public getMainAreaWidth(): number {
        if (this.mainAreaContainer.current) {
            return this.mainAreaContainer.current.clientWidth;
        }
        return 1000;
    }

    public getHandleWidth(): number {
        return this.HANDLE_WIDTH;
    }

    abstract renderMainArea(): React.ReactNode;
}
