import * as React from 'react';
import { OutputDescriptor } from 'tsp-typescript-client/lib/models/output-descriptor';
import { TspClient } from 'tsp-typescript-client/lib/protocol/tsp-client';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBars, faTimes } from '@fortawesome/free-solid-svg-icons';
import { TimeGraphUnitController } from 'timeline-chart/lib/time-graph-unit-controller';
import { TimeRange } from 'traceviewer-base/lib/utils/time-range';
import { OutputComponentStyle } from './utils/output-component-style';
import { OutputStyleModel } from 'tsp-typescript-client/lib/models/styles';
import { TooltipComponent } from './tooltip-component';
import { TooltipXYComponent } from './tooltip-xy-component';
import { ResponseStatus } from 'tsp-typescript-client/lib/models/response/responses';
import { signalManager } from 'traceviewer-base/lib/signals/signal-manager';

export interface AbstractOutputProps {
    tspClient: TspClient;
    tooltipComponent: TooltipComponent | null;
    tooltipXYComponent: TooltipXYComponent | null;
    traceId: string;
    traceName?: string;
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
    pinned?: boolean
}

export interface AbstractOutputState {
    outputStatus: string;
    styleModel?: OutputStyleModel;
    optionsDropdownOpen: boolean;
    additionalOptions?: boolean;
}

export abstract class AbstractOutputComponent<P extends AbstractOutputProps, S extends AbstractOutputState> extends React.Component<P, S> {

    private readonly DEFAULT_HANDLE_WIDTH = 30;

    protected mainOutputContainer: React.RefObject<HTMLDivElement>;

    private optionsMenuRef: React.RefObject<HTMLDivElement>;

    constructor(props: P) {
        super(props);
        this.mainOutputContainer = React.createRef();
        this.closeComponent = this.closeComponent.bind(this);
        this.renderTitleBar = this.renderTitleBar.bind(this);
        this.openOptionsMenu = this.openOptionsMenu.bind(this);
        this.closeOptionsMenu = this.closeOptionsMenu.bind(this);
        this.optionsMenuRef = React.createRef();
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
                className={(this.props.pinned !== false || this.state.additionalOptions) ? 'widget-handle-with-options' : 'widget-handle'}
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
            {(this.props.pinned !== false || this.state.additionalOptions) && <div className='options-menu-container'>
                <button title="Show View Options" className='options-menu-button' onClick={this.openOptionsMenu}>
                    <FontAwesomeIcon icon={faBars} />
                </button>
                {this.state.optionsDropdownOpen && <div className="options-menu-drop-down" ref={this.optionsMenuRef}>
                    {this.showOptions()}
                </div>}
            </div>}
            <div className='title-bar-label' title={outputName} onClick={() => this.setFocus()}>
                {outputName}
                <i id={this.props.traceId + this.props.outputDescriptor.id + 'handleSpinner'} className='fa fa-refresh fa-spin'
                    style={{ marginTop: '5px', visibility: 'hidden'}} />
                {this.props.pinned === true && <i title='Pinned View' className='fa fa-thumb-tack pin-view-icon' />}
            </div>
        </React.Fragment>;
    }

    private closeComponent() {
        if (this.props.pinned) {
            signalManager().fireUnPinView();
        }
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

    private showOptions(): React.ReactNode {
        return <React.Fragment>
            <ul>
                {this.props.pinned === undefined && <li className='drop-down-list-item' onClick={() => this.pinView()}>Pin View</li>}
                {this.props.pinned === true && <li className='drop-down-list-item' onClick={() => this.unPinView()}>Unpin View</li>}
            </ul>
            {this.state.additionalOptions && this.showAdditionalOptions()}
        </React.Fragment>;
    }

    protected showAdditionalOptions(): React.ReactNode {
        return <></>;
    }

    protected closeOptionsDropDown(): void {
        return;
    }

    protected pinView(): void {
        signalManager().firePinView(this.props.outputDescriptor);
    }

    protected unPinView(): void {
        signalManager().fireUnPinView();
    }

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

    private openOptionsMenu(): void {
        this.setState({optionsDropdownOpen: true}, () => {
            document.addEventListener('click', this.closeOptionsMenu);
        });
    }

    private closeOptionsMenu(event: Event): void {
        if (event && event.target instanceof Node && this.optionsMenuRef.current?.contains(event.target)) {
            return;
        }
        if (!this.optionsMenuRef.current) {
            return;
        }
        this.closeOptionsDropDown();
        this.setState({optionsDropdownOpen: false}, () => {
            document.removeEventListener('click', this.closeOptionsMenu);
        });
    }
}
