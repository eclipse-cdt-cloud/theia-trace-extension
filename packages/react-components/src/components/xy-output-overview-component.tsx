import { AbstractOutputProps } from './abstract-output-component';
import { ResponseStatus } from 'tsp-typescript-client/lib/models/response/responses';
import * as React from 'react';
import { drawSelection } from './utils/xy-output-component-utils';
import { TimeRange } from 'traceviewer-base/lib/utils/time-range';
import { AbstractXYOutputState, MouseButton } from './abstract-xy-output-component';
import {
    AbstractXYOutputComponent,
    FLAG_PAN_LEFT,
    FLAG_PAN_RIGHT,
    FLAG_ZOOM_IN,
    FLAG_ZOOM_OUT,
    XY_OUTPUT_KEY_ACTIONS
} from './abstract-xy-output-component';
import { Experiment } from 'tsp-typescript-client';
import { TraceOverviewSelectionDialogComponent } from './trace-overview-selection-dialog-component';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner } from '@fortawesome/free-solid-svg-icons';

const COLOR = {
    SELECTION_RANGE: '#259fd8',
    VIEW_RANGE: '#cccccc'
};

type XYOutputOverviewState = AbstractXYOutputState & {
    shiftKey: boolean;
    showModal: boolean;
};

type XYOutputOverviewProps = AbstractOutputProps & {
    experiment: Experiment;
};

/**
 * The overview uses the viewRange for the orange overlay, selectionRange for the blue overlay.
 * It will only be setting these properties.
 */

export class XYOutputOverviewComponent extends AbstractXYOutputComponent<XYOutputOverviewProps, XYOutputOverviewState> {
    private initialViewRangeStartPosition = 0;
    private initialViewRangeEndPosition = 0;
    private viewRangeMoveStartOffsetX = 0;
    private keyMapping: Map<string, XY_OUTPUT_KEY_ACTIONS>;

    constructor(props: XYOutputOverviewProps) {
        super(props);
        this.state = {
            outputStatus: ResponseStatus.RUNNING,
            selectedSeriesId: [],
            xyTree: [],
            checkedSeries: [],
            collapsedNodes: [],
            orderedNodes: [],
            xyData: {},
            columns: [{ title: 'Name', sortable: true }],
            allMax: 0,
            allMin: 0,
            cursor: 'default',
            shiftKey: false,
            showModal: false,
            showTree: true
        };
        this.keyMapping = this.getKeyActionMap();
        this.afterChartDraw = this.afterChartDraw.bind(this);
        this.closeOverviewOutputSelector = this.closeOverviewOutputSelector.bind(this);
        this.addOptions('Select source output', () => this.openOverviewOutputSelector());
        this.addOptions('Toggle filter tree', () => this.toggleTree());
    }

    renderChart(): React.ReactNode {
        const selectionDialog = (
            <TraceOverviewSelectionDialogComponent
                isOpen={this.state.showModal}
                title="Select overview output source"
                tspClient={this.props.tspClient}
                traceID={this.props.traceId}
                onCloseDialog={this.closeOverviewOutputSelector}
            ></TraceOverviewSelectionDialogComponent>
        );
        if (this.state.outputStatus === ResponseStatus.COMPLETED && this.state.xyData?.datasets?.length === 0) {
            return (
                <React.Fragment>
                    {selectionDialog}
                    <div className="chart-message">Select a checkbox to see analysis results</div>
                </React.Fragment>
            );
        }
        return (
            <React.Fragment>
                {selectionDialog}
                <div
                    id={this.getOutputComponentDomId() + 'focusContainer'}
                    className="xy-main"
                    tabIndex={0}
                    onKeyDown={event => this.onKeyDown(event)}
                    onKeyUp={event => this.onKeyUp(event)}
                    onWheel={event => this.onWheel(event)}
                    onMouseMove={event => this.onMouseMove(event)}
                    onContextMenu={event => event.preventDefault()}
                    onMouseLeave={event => this.onMouseLeave(event)}
                    onMouseDown={event => this.onMouseDown(event)}
                    style={{ height: this.props.style.height, position: 'relative', cursor: this.state.cursor }}
                    ref={this.divRef}
                >
                    {this.chooseChart()}
                </div>
                {this.state.outputStatus === ResponseStatus.RUNNING && (
                    <div className="analysis-running-overflow" style={{ width: this.getChartWidth() }}>
                        <div>
                            <FontAwesomeIcon icon={faSpinner} spin style={{ marginRight: '5px' }} />
                            <span> Analysis running </span>
                        </div>
                    </div>
                )}
            </React.Fragment>
        );
    }

    protected getDisplayedRange(): TimeRange {
        return this.props.range;
    }

    protected afterChartDraw(ctx: CanvasRenderingContext2D | null, chartArea?: Chart.ChartArea | null): void {
        if (ctx) {
            if (this.props.viewRange) {
                const startPixel = this.getXForTime(this.props.viewRange.getStart());
                const endPixel = this.getXForTime(this.props.viewRange.getEnd());
                ctx.strokeStyle = COLOR.VIEW_RANGE;
                ctx.fillStyle = COLOR.VIEW_RANGE;

                drawSelection({
                    ctx: ctx,
                    chartArea: chartArea,
                    startPixel: startPixel,
                    endPixel: endPixel,
                    isBarPlot: this.isBarPlot,
                    props: this.props,
                    invertSelection: true
                });
            }

            if (this.props.selectionRange) {
                const selectionRangeStart = this.getXForTime(this.props.selectionRange.getStart());
                const selectionRangeEnd = this.getXForTime(this.props.selectionRange.getEnd());
                ctx.strokeStyle = COLOR.SELECTION_RANGE;
                ctx.fillStyle = COLOR.SELECTION_RANGE;

                drawSelection({
                    ctx: ctx,
                    chartArea: chartArea,
                    startPixel: selectionRangeStart,
                    endPixel: selectionRangeEnd,
                    isBarPlot: this.isBarPlot,
                    props: this.props,
                    invertSelection: false
                });
            }

            if (this.clickedMouseButton === MouseButton.RIGHT) {
                const offset = this.props.viewRange.getOffset() ?? BigInt(0);
                const startPixel = this.getXForTime(this.startPositionMouseRightClick + offset);
                const endPixel = this.positionXMove;
                ctx.strokeStyle = COLOR.VIEW_RANGE;
                ctx.fillStyle = COLOR.VIEW_RANGE;
                drawSelection({
                    ctx: ctx,
                    chartArea: chartArea,
                    startPixel: startPixel,
                    endPixel: endPixel,
                    isBarPlot: this.isBarPlot,
                    props: this.props,
                    invertSelection: true
                });
            }
        }
    }

    protected getZoomTime(): bigint {
        return (this.props.unitController.viewRange.start + this.props.unitController.viewRange.end) / BigInt(2);
    }

    private getKeyActionMap(): Map<string, XY_OUTPUT_KEY_ACTIONS> {
        const map = new Map<string, XY_OUTPUT_KEY_ACTIONS>();

        // Key that corresponds to the zoom in action
        map.set('W', XY_OUTPUT_KEY_ACTIONS.ZOOM_IN);
        map.set('w', XY_OUTPUT_KEY_ACTIONS.ZOOM_IN);
        map.set('I', XY_OUTPUT_KEY_ACTIONS.ZOOM_IN);
        map.set('i', XY_OUTPUT_KEY_ACTIONS.ZOOM_IN);

        // Key that corresponds to the zoom out action
        map.set('S', XY_OUTPUT_KEY_ACTIONS.ZOOM_OUT);
        map.set('s', XY_OUTPUT_KEY_ACTIONS.ZOOM_OUT);
        map.set('K', XY_OUTPUT_KEY_ACTIONS.ZOOM_OUT);
        map.set('k', XY_OUTPUT_KEY_ACTIONS.ZOOM_OUT);

        // Key that corresponds to the pan left action
        map.set('A', XY_OUTPUT_KEY_ACTIONS.PAN_LEFT);
        map.set('a', XY_OUTPUT_KEY_ACTIONS.PAN_LEFT);
        map.set('J', XY_OUTPUT_KEY_ACTIONS.PAN_LEFT);
        map.set('j', XY_OUTPUT_KEY_ACTIONS.PAN_LEFT);
        map.set('ArrowLeft', XY_OUTPUT_KEY_ACTIONS.PAN_LEFT);

        // Key that corresponds to the pan right action
        map.set('D', XY_OUTPUT_KEY_ACTIONS.PAN_RIGHT);
        map.set('d', XY_OUTPUT_KEY_ACTIONS.PAN_RIGHT);
        map.set('L', XY_OUTPUT_KEY_ACTIONS.PAN_RIGHT);
        map.set('l', XY_OUTPUT_KEY_ACTIONS.PAN_RIGHT);
        map.set('ArrowRight', XY_OUTPUT_KEY_ACTIONS.PAN_RIGHT);

        map.set('Shift', XY_OUTPUT_KEY_ACTIONS.SHIFT_PRESS);

        return map;
    }

    private onKeyDown(key: React.KeyboardEvent): void {
        this.hideTooltip();
        if (!this.isMouseLeave) {
            const action = this.keyMapping.get(key.key);
            switch (action) {
                case XY_OUTPUT_KEY_ACTIONS.ZOOM_IN: {
                    this.zoom(FLAG_ZOOM_IN);
                    break;
                }
                case XY_OUTPUT_KEY_ACTIONS.ZOOM_OUT: {
                    this.zoom(FLAG_ZOOM_OUT);
                    break;
                }
                case XY_OUTPUT_KEY_ACTIONS.PAN_LEFT: {
                    this.pan(FLAG_PAN_LEFT);
                    break;
                }
                case XY_OUTPUT_KEY_ACTIONS.PAN_RIGHT: {
                    this.pan(FLAG_PAN_RIGHT);
                    break;
                }
                case XY_OUTPUT_KEY_ACTIONS.SHIFT_PRESS: {
                    this.shiftKeyPress();
                    break;
                }
            }
        }
    }

    private onKeyUp(key: React.KeyboardEvent): void {
        if (key.key === 'Shift') {
            const change: { cursor?: string; shiftKey: boolean } = { shiftKey: false };
            if (!this.mouseIsDown) {
                change.cursor = 'default';
            }
            this.setState(change);
        }
    }

    private onMouseDown(event: React.MouseEvent<HTMLDivElement, MouseEvent>): void {
        this.isMouseLeave = false;
        this.mouseIsDown = true;
        this.clickedMouseButton = event.button;

        if (this.clickedMouseButton === MouseButton.RIGHT) {
            this.onRightButtonClick(event);
        } else if (this.clickedMouseButton === MouseButton.MID) {
            this.onMidButtonClick(event);
        } else {
            this.onLeftButtonClick(event);
        }

        document.addEventListener('mouseup', this.endSelection);
    }

    private onMouseMove(event: React.MouseEvent): void {
        this.positionXMove = event.nativeEvent.offsetX;
        this.isMouseLeave = false;

        if (this.mouseIsDown && this.clickedMouseButton === MouseButton.LEFT) {
            this.updateSelection();
        }

        if (this.mouseIsDown && this.clickedMouseButton === MouseButton.MID) {
            this.updateViewRange();
        }

        if (this.mouseIsDown && this.clickedMouseButton === MouseButton.RIGHT) {
            this.forceUpdate();
        }

        if (this.state.xyData.datasets.length > 0) {
            this.tooltip(event.nativeEvent.x, event.nativeEvent.y);
        }
    }

    private onMouseLeave(event: React.MouseEvent) {
        this.isMouseLeave = true;
        const width = this.isBarPlot ? this.getChartWidth() : this.chartRef.current.chartInstance.width;
        this.positionXMove = Math.max(0, Math.min(event.nativeEvent.offsetX, width));
        this.forceUpdate();
        if (this.mouseIsDown && !(this.clickedMouseButton === MouseButton.RIGHT)) {
            this.updateSelection();
        }
        this.hideTooltip();
    }

    private onMidButtonClick(event: React.MouseEvent) {
        this.setState({ cursor: 'grab' });
        this.initialViewRangeStartPosition = this.getXForTime(this.props.viewRange.getStart());
        this.initialViewRangeEndPosition = this.getXForTime(this.props.viewRange.getEnd());
        this.viewRangeMoveStartOffsetX = event.nativeEvent.offsetX;
    }

    private onRightButtonClick(event: React.MouseEvent): void {
        this.setState({ cursor: 'crosshair' });
        this.startPositionMouseRightClick = this.getTimeForX(event.nativeEvent.offsetX);
    }

    private onLeftButtonClick(event: React.MouseEvent): void {
        const startTime = this.getTimeForX(event.nativeEvent.offsetX);
        this.setState({ cursor: 'crosshair' });
        if (event.shiftKey && this.props.unitController.selectionRange) {
            this.props.unitController.selectionRange = {
                start: this.props.unitController.selectionRange.start,
                end: startTime
            };
        } else {
            this.props.unitController.selectionRange = {
                start: startTime,
                end: startTime
            };
        }
        this.onMouseMove(event);
    }

    private updateViewRange(): void {
        // Calculate the moved distance
        const pixelsMoved = this.positionXMove - this.viewRangeMoveStartOffsetX;
        let startPixel = this.initialViewRangeStartPosition + pixelsMoved;
        let endPixel = this.initialViewRangeEndPosition + pixelsMoved;
        const leftLimit = this.chartRef.current.chartInstance.chartArea.left;
        const rightLimit = this.chartRef.current.chartInstance.chartArea.right;

        // The user moved out-of-graph on the left side
        if (startPixel < leftLimit) {
            startPixel = leftLimit;
            endPixel = this.initialViewRangeEndPosition - this.initialViewRangeStartPosition;
        }
        // The user moved out-of-graph on the right side
        else if (endPixel > rightLimit) {
            startPixel = rightLimit - (this.initialViewRangeStartPosition - this.initialViewRangeEndPosition);
            endPixel = rightLimit;
        }

        if (this.props.unitController.viewRange) {
            this.props.unitController.viewRange = {
                start: this.getTimeForX(startPixel),
                end: this.getTimeForX(endPixel)
            };
        }
    }

    private onWheel(wheel: React.WheelEvent): void {
        this.isMouseLeave = false;
        if (wheel.shiftKey) {
            if (wheel.deltaY < 0) {
                this.pan(FLAG_PAN_LEFT);
            } else if (wheel.deltaY > 0) {
                this.pan(FLAG_PAN_RIGHT);
            }
        } else if (wheel.ctrlKey) {
            if (wheel.deltaY < 0) {
                this.zoom(FLAG_ZOOM_IN);
            } else if (wheel.deltaY > 0) {
                this.zoom(FLAG_ZOOM_OUT);
            }
        }
    }

    private shiftKeyPress(): void {
        if (this.clickedMouseButton !== MouseButton.RIGHT) {
            this.setState({ cursor: 'crosshair', shiftKey: true });
        }
    }

    protected getOutputComponentDomId(): string {
        return this.props.traceId + this.props.outputDescriptor.id + 'overview';
    }

    protected getOutputComponentName(): string {
        return 'Overview';
    }

    protected getTitleBarTooltip(): string {
        return this.props.outputDescriptor.name + ' overview';
    }

    private closeOverviewOutputSelector(): void {
        this.setState({ showModal: false });
    }

    private openOverviewOutputSelector() {
        this.setState({ showModal: true });
    }

    private toggleTree() {
        this.setState(
            {
                showTree: !this.state.showTree
            },
            () => {
                this.closeDropDown();
            }
        );
    }
}
