import * as React from 'react';
import { OutputDescriptor } from 'tsp-typescript-client/lib/models/output-descriptor';
import { ITspClient } from 'tsp-typescript-client/lib/protocol/tsp-client';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBars, faSpinner, faThumbtack, faTimes } from '@fortawesome/free-solid-svg-icons';
import { TimeGraphUnitController } from 'timeline-chart/lib/time-graph-unit-controller';
import { TimeRange } from 'traceviewer-base/lib/utils/time-range';
import { OutputComponentStyle } from './utils/output-component-style';
import { OutputStyleModel } from 'tsp-typescript-client/lib/models/styles';
import { TooltipComponent } from './tooltip-component';
import { TooltipXYComponent } from './tooltip-xy-component';
import { ResponseStatus } from 'tsp-typescript-client/lib/models/response/responses';
import { signalManager } from 'traceviewer-base/lib/signals/signal-manager';
import { DropDownComponent, DropDownSubSection, OptionState } from './drop-down-component';

export interface AbstractOutputProps {
    tspClient: ITspClient;
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
    pinned?: boolean;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    persistChartState?: any;
    children?: string;
}

export interface AbstractOutputState {
    outputStatus: string;
    styleModel?: OutputStyleModel;
    dropDownOpen?: boolean;
}

export abstract class AbstractOutputComponent<
    P extends AbstractOutputProps,
    S extends AbstractOutputState
> extends React.Component<P, S> {
    private readonly DEFAULT_HANDLE_WIDTH = 30;

    protected mainOutputContainer: React.RefObject<HTMLDivElement>;

    protected dropDownMenuRef: React.RefObject<DropDownComponent>;

    private titleRef: React.RefObject<HTMLSpanElement>;

    private titleBarLabelRef: React.RefObject<HTMLDivElement>;

    public readonly PIN_VIEW_LABEL = 'Pin View';

    public readonly UNPIN_VIEW_LABEL = 'Unpin View';

    public readonly TOGGLE_COLUMN_LABEL = 'Toggle Columns';

    private dropDownOptions: OptionState[] = [];

    constructor(props: P) {
        super(props);
        this.mainOutputContainer = React.createRef();
        this.closeComponent = this.closeComponent.bind(this);
        this.renderTitleBar = this.renderTitleBar.bind(this);
        this.toggleDropDown = this.toggleDropDown.bind(this);
        this.openDropDown = this.openDropDown.bind(this);
        this.closeDropDown = this.closeDropDown.bind(this);
        this.dropDownMenuRef = React.createRef();
        this.titleRef = React.createRef();
        this.titleBarLabelRef = React.createRef();
    }

    render(): JSX.Element {
        return (
            <div
                style={{ ...this.props.style, width: this.props.outputWidth }}
                id={this.getOutputComponentDomId()}
                tabIndex={-1}
                className={'output-container ' + this.props.className}
                onMouseUp={this.props.onMouseUp}
                onMouseDown={this.props.onMouseDown}
                onTouchStart={this.props.onTouchStart}
                onTouchEnd={this.props.onTouchEnd}
                data-tip=""
                data-for="tooltip-component"
            >
                <div
                    id={this.getOutputComponentDomId() + 'handle'}
                    className={this.showViewOptionsCondition() ? 'widget-handle-with-options' : 'widget-handle'}
                    style={{ width: this.getHandleWidth(), height: this.props.style.height }}
                >
                    {this.renderTitleBar()}
                </div>
                <div
                    className="main-output-container"
                    ref={this.mainOutputContainer}
                    style={{ width: this.props.outputWidth - this.getHandleWidth(), height: this.props.style.height }}
                >
                    {this.renderMainOutputContainer()}
                </div>
                {this.props.children}
            </div>
        );
    }

    private renderTitleBar(): React.ReactNode {
        const outputName = this.getOutputComponentName();
        const outputTooltip = this.getTitleBarTooltip();
        // Manually check overflown titles to fix ellipsis not shown on Safari (issue #764).
        const isOverflown = () => {
            const el = this.titleRef.current;
            const labelHeight = this.titleBarLabelRef.current;
            if (!el || !labelHeight) {
                return false;
            }
            return el.getBoundingClientRect().height > labelHeight.getBoundingClientRect().height;
        };
        const titleOverflown = this.titleRef.current && isOverflown() ? 'custom-ellipsis' : 'hidden-ellipsis';

        return (
            <React.Fragment>
                <button className="remove-component-button" onClick={this.closeComponent}>
                    <FontAwesomeIcon icon={faTimes} />
                </button>
                {this.showViewOptionsCondition() && (
                    <div className="options-menu-container">
                        <button title="Show View Options" className="options-menu-button" onClick={this.toggleDropDown}>
                            <FontAwesomeIcon icon={faBars} />
                        </button>
                        <DropDownComponent
                            dropDownOpen={this.state.dropDownOpen ?? false}
                            dropDownOptions={this.dropDownOptions}
                            ref={this.dropDownMenuRef}
                            {...this.props}
                        ></DropDownComponent>
                    </div>
                )}
                <div
                    ref={this.titleBarLabelRef}
                    className="title-bar-label"
                    title={outputTooltip}
                    onClick={() => this.setFocus()}
                >
                    <span ref={this.titleRef}>{outputName}</span>
                    <span className={titleOverflown}>...</span>
                    <FontAwesomeIcon
                        id={this.getOutputComponentDomId() + 'handleSpinner'}
                        icon={faSpinner}
                        spin
                        style={{ marginTop: '5px', visibility: 'hidden' }}
                    />
                    {this.props.pinned === true && (
                        <FontAwesomeIcon icon={faThumbtack} title="Pinned View" className="pin-view-icon" />
                    )}
                </div>
            </React.Fragment>
        );
    }

    private showViewOptionsCondition(): boolean {
        const nonPinViewOptionExists = this.dropDownOptions.some(
            option => option.label !== this.PIN_VIEW_LABEL && option.label !== this.UNPIN_VIEW_LABEL
        );
        return nonPinViewOptionExists || this.props.pinned !== false;
    }

    protected toggleDropDown(): void {
        if (this.state.dropDownOpen) {
            this.closeDropDown();
        } else {
            this.openDropDown();
        }
    }

    protected closeDropDown(): void {
        this.setState({
            dropDownOpen: false
        });
    }

    protected openDropDown(): void {
        this.setState({
            dropDownOpen: true
        });
    }

    private closeComponent() {
        if (this.props.pinned) {
            signalManager().emit('UNPIN_VIEW', this.props.outputDescriptor);
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

    protected addPinViewOptions(arg?: () => unknown): void {
        this.addOptions(
            this.PIN_VIEW_LABEL,
            () => this.pinView(),
            arg,
            () => this.props.pinned === undefined
        );
        this.addOptions(
            this.UNPIN_VIEW_LABEL,
            () => this.unPinView(),
            arg,
            () => this.props.pinned === true
        );
    }

    protected addOptions(
        label: string,
        onClick?: (arg?: unknown) => void,
        arg?: unknown,
        condition?: () => boolean,
        subSection?: DropDownSubSection
    ): void {
        const newOption = {
            label: label,
            onClick: onClick,
            arg: arg,
            condition: condition,
            subSection: subSection
        } as OptionState;
        if (this.dropDownOptions.includes(newOption)) {
            return;
        }
        this.dropDownOptions = [...(this.dropDownOptions ?? []), newOption];
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-module-boundary-types
    protected pinView(payload?: any): void {
        signalManager().emit('PIN_VIEW', this.props.outputDescriptor, payload);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-module-boundary-types
    protected unPinView(payload?: any): void {
        if (payload) {
            signalManager().emit('UNPIN_VIEW', this.props.outputDescriptor, payload);
        } else {
            signalManager().emit('UNPIN_VIEW', this.props.outputDescriptor);
        }
    }

    protected renderAnalysisFailed(): React.ReactElement {
        return (
            <>
                <div className="message-main-area">Trace analysis failed.</div>
            </>
        );
    }

    protected renderEmptyResults(): React.ReactElement {
        return (
            <>
                <div className="message-main-area">
                    Trace analysis complete.
                    <br />
                    No results: Trace missing required events.
                </div>
            </>
        );
    }

    protected getOutputComponentDomId(): string {
        return this.props.traceId + this.props.outputDescriptor.id;
    }

    protected getOutputComponentName(): string {
        return this.props.outputDescriptor.name;
    }

    protected getTitleBarTooltip(): string {
        return this.props.outputDescriptor.name;
    }
}
