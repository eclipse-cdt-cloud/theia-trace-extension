import * as React from 'react';
import { TimeGraphContainer, TimeGraphContainerOptions } from 'timeline-chart/lib/time-graph-container';
import { TimeGraphUnitController } from 'timeline-chart/lib/time-graph-unit-controller';
import { TimeGraphAxis } from 'timeline-chart/lib/layer/time-graph-axis';
import { TimeGraphAxisCursors } from 'timeline-chart/lib/layer/time-graph-axis-cursors';
import { TimeGraphChartGrid } from 'timeline-chart/lib/layer/time-graph-chart-grid';
import { TimeGraphChart, TimeGraphChartProviders } from 'timeline-chart/lib/layer/time-graph-chart';
import { TimeGraphChartCursors } from 'timeline-chart/lib/layer/time-graph-chart-cursors';
import { TimeGraphChartSelectionRange } from 'timeline-chart/lib/layer/time-graph-chart-selection-range';
import { TimeGraphNavigator } from 'timeline-chart/lib/layer/time-graph-navigator';
import { TimeGraphVerticalScrollbar } from 'timeline-chart/lib/layer/time-graph-vertical-scrollbar';
import { TimeGraphLayer } from 'timeline-chart/lib/layer/time-graph-layer';
import { TimeGraphRowElementStyle, TimeGraphRowElement } from 'timeline-chart/lib/components/time-graph-row-element';
import { TimeGraphRowController } from 'timeline-chart/lib/time-graph-row-controller';
import { TimelineChart } from 'timeline-chart/lib/time-graph-model';
import { TspDataProvider } from './tsp-data-provider';
import { TspClient } from 'tsp-typescript-client/lib/protocol/tsp-client';
import { Trace } from 'tsp-typescript-client/lib/models/trace';

export class TimeGraphView {
    protected styleConfig = {
        mainWidth: 1120,
        mainHeight: 300,
        naviBackgroundColor: 0x3f3f3f,
        chartBackgroundColor: 0x3f3f3f,
        cursorColor: 0x8888ff,
        lineColor: 0xbbbbbb
    }
    protected rowHeight = 15;
    protected totalHeight: number = 0;

    protected unitController: TimeGraphUnitController;
    protected rowController: TimeGraphRowController;
    protected dataProvider: TspDataProvider;

    protected timeGraphData?: TimelineChart.TimeGraphModel;

    protected chartLayer: TimeGraphChart;
    // protected arrows: TimeGraphChartArrows;
    protected vscrollLayer: TimeGraphVerticalScrollbar;

    protected styleMap = new Map<string, TimeGraphRowElementStyle>();

    protected horizontalContainer: React.RefObject<HTMLDivElement>;

    protected widgetResizeHandlers: (() => void)[] = [];
    protected readonly addWidgetResizeHandler = (h: () => void) => {
        this.widgetResizeHandlers.push(h);
    }

    private tspClient: TspClient;

    constructor(client: TspClient, outputId: string, protected handler: {
        updateHandler: () => void,
        selectionHandler: (el?: TimeGraphRowElement) => void,
        mouseOverHandler: (el?: TimeGraphRowElement) => void
        mouseOutHandler: (el?: TimeGraphRowElement) => void
    }) {
        this.tspClient = client;
        this.dataProvider = new TspDataProvider(client, outputId);
        this.unitController = new TimeGraphUnitController(0);
        this.rowController = new TimeGraphRowController(this.rowHeight, this.totalHeight);

        // this.unitController.scaleSteps = [1, 2];

        const providers: TimeGraphChartProviders = {
            dataProvider: async (range: TimelineChart.TimeGraphRange, resolution: number) => {
                if (this.unitController) {
                    const length = range.end - range.start;
                    const overlap = ((length * 5) - length) / 2;
                    const start = range.start - overlap > 0 ? range.start - overlap : 0;
                    const end = range.end + overlap < this.unitController.absoluteRange ? range.end + overlap : this.unitController.absoluteRange;
                    const newRange: TimelineChart.TimeGraphRange = { start, end };
                    const newResolution: number = resolution * 0.8;
                    this.timeGraphData = await this.dataProvider.getData(newRange, newResolution);
                    if (this.timeGraphData && selectedElement) {
                        for (const row of this.timeGraphData.rows) {
                            const selEl = row.states.find(el => !!selectedElement && el.id === selectedElement.id);
                            if (selEl) {
                                selEl.selected = true;
                                break;
                            }
                        }
                    }
                    return {
                        rows: this.timeGraphData ? this.timeGraphData.rows : [],
                        range: newRange,
                        resolution: newResolution
                    };
                }
                return {
                    rows: [],
                    range: { start: 0, end: 0 },
                    resolution: 0
                };
            },
            rowElementStyleProvider: (model: TimelineChart.TimeGraphRowElementModel) => {
                // const styles: TimeGraphRowElementStyle[] = [
                //     {
                //         color: 0xf19d0b,
                //         height: this.rowHeight * 0.8
                //     }, {
                //         color: 0xf0670a,
                //         height: this.rowHeight * 0.7
                //     }, {
                //         color: 0xef2809,
                //         height: this.rowHeight * 0.6
                //     }, {
                //         color: 0xf0670a,
                //         height: this.rowHeight * 0.5
                //     }, {
                //         color: 0xf0670a,
                //         height: this.rowHeight * 0.4
                //     }, {
                //         color: 0xf0670a,
                //         height: this.rowHeight * 0.9
                //     }, {
                //         color: 0xf0670a,
                //         height: this.rowHeight * 0.3
                //     },
                // ];
                const styles: TimeGraphRowElementStyle[] = [
                    {
                        color: 0x3891A6,
                        height: this.rowHeight * 0.8
                    }, {
                        color: 0x4C5B5C,
                        height: this.rowHeight * 0.7
                    }, {
                        color: 0xFDE74C,
                        height: this.rowHeight * 0.6
                    }, {
                        color: 0xDB5461,
                        height: this.rowHeight * 0.5
                    }, {
                        color: 0xE3655B,
                        height: this.rowHeight * 0.4
                    }, {
                        color: 0xEA8F87,
                        height: this.rowHeight * 0.9
                    }, {
                        color: 0xDE636F,
                        height: this.rowHeight * 0.3
                    },
                ];
                let style: TimeGraphRowElementStyle | undefined = styles[0];
                const val = model.label;
                const modelData = model.data;
                if(modelData) {
                    const value = modelData.stateValue;
                    style = this.styleMap.get(value);
                    if (!style) {
                        style = styles[(value % styles.length)];
                        this.styleMap.set(value, style);
                    }
                    return {
                        color: style.color,
                        height: style.height,
                        borderWidth: model.selected ? 2 : 0,
                        borderColor: 0xeef20c
                    };
                }

                style = this.styleMap.get(val);
                if (!style) {
                    style = styles[(this.styleMap.size % styles.length)];
                    this.styleMap.set(val, style);
                }
                return {
                    color: style.color,
                    height: style.height,
                    borderWidth: model.selected ? 2 : 0,
                    borderColor: 0xeef20c
                };
            },
            rowStyleProvider: (row: TimelineChart.TimeGraphRowModel) => {
                return {
                    backgroundColor: 0xaaaaff,
                    backgroundOpacity: row.selected ? 0.2 : 0,
                    lineColor: row.data && row.data.hasStates ? 0xdddddd : 0xaa4444,
                    lineThickness: row.data && row.data.hasStates ? 1 : 3
                }
            }
        }

        this.horizontalContainer = React.createRef();

        this.chartLayer = new TimeGraphChart('timeGraphChart', providers, this.rowController);
        let origColor: number | undefined;
        this.chartLayer.registerRowElementMouseInteractions({
            mouseover: (el: TimeGraphRowElement, ev: PIXI.interaction.InteractionEvent) => {
                origColor = el.style.color;
                el.style = {
                    color: 0xceeda3
                }
                this.handler.mouseOverHandler(el);
            },
            mouseout: (el: TimeGraphRowElement, ev: PIXI.interaction.InteractionEvent) => {
                el.style = {
                    color: origColor
                }
                this.handler.mouseOutHandler(el);
            }
        });
        let selectedElement: TimeGraphRowElement | undefined;
        this.chartLayer.onSelectedRowElementChanged((model) => {
            if (model) {
                const el = this.chartLayer.getElementById(model.id);
                if (el) {
                    selectedElement = el;
                }
            } else {
                selectedElement = undefined;
            }
            this.handler.selectionHandler(selectedElement);
        });
        this.vscrollLayer = new TimeGraphVerticalScrollbar('timeGraphVerticalScrollbar', this.rowController);
        this.initialize();
    }

    protected async initialize() {
        const traces: Trace[] = await this.tspClient.fetchTraces();
        if (traces && traces.length) {
            // const resourcesTreeParameters = QueryHelper.timeQuery([0, 1]);
            // const treeResponse = await this.tspClient.fetchTimeGraphTree<TimeGraphEntry, EntryHeader>(
            //     traces[0].UUID,
            //     'org.eclipse.tracecompass.internal.analysis.os.linux.core.threadstatus.ResourcesStatusDataProvider',
            //     resourcesTreeParameters);
            // const nbEntries = treeResponse.model ? treeResponse.model.entries.length : 1;
            // const traceStart = traces[0].start;
            // const traceEnd = traces[0].end;
            // const traceRange = traceEnd - traceStart;
            // this.unitController.absoluteRange = traceRange;
            const traceData = await this.dataProvider.getData();
            this.unitController.absoluteRange = traceData.totalLength;
            this.unitController.numberTranslator = (theNumber: number) => {
                const originalStart = traceData.data && traceData.data.originalStart ? traceData.data.originalStart : 0;
                theNumber += originalStart;
                const milli = Math.floor(theNumber / 1000000);
                const micro = Math.floor((theNumber % 1000000) / 1000);
                const nano = Math.floor((theNumber % 1000000) % 1000);
                return milli + ':' + micro + ':' + nano; // THAT IS TOO LONG, need to find better format
            };
            this.unitController.viewRange = {
                start: 0,
                end: this.unitController.absoluteRange
            };
            // this.totalHeight = nbEntries * this.rowHeight;
            this.totalHeight = traceData.rows.length * this.rowHeight;
            this.rowController.totalHeight = this.totalHeight;
        }
        window.onresize = () => this.onWidgetResize();
        this.onWidgetResize();
    }

    onWidgetResize() {
        this.styleConfig.mainWidth = this.horizontalContainer.current ? this.horizontalContainer.current.clientWidth : 1000;
        this.handler.updateHandler();
        this.widgetResizeHandlers.forEach(h => h());
    }

    renderTimeGraphChart(): React.ReactNode {
        return <React.Fragment>
            {this.renderMainGraphContent()}
            <div id='main-vscroll'>
                {this.getVerticalScrollbar()}
            </div>
        </React.Fragment >
    }
    protected renderMainGraphContent() {
        return <div id='main-timegraph-content' ref={this.horizontalContainer}>
            {this.getAxisContainer()}
            {this.getChartContainer()}
            {this.getNaviContainer()}
        </div>
    }

    protected getAxisContainer() {
        const axisLayer = this.getAxisLayer();
        const axisCursorLayer = this.getAxisCursors();
        return <ReactTimeGraphContainer
            id='timegraph-axis'
            options={{
                id: 'timegraph-axis',
                height: 30,
                width: this.styleConfig.mainWidth,
                backgroundColor: 0xFFFFFF,
                classNames: 'horizontal-canvas'
            }}
            onWidgetResize={this.addWidgetResizeHandler}
            unitController={this.unitController}
            layer={[axisLayer, axisCursorLayer]}>
        </ReactTimeGraphContainer>;
    }

    protected getAxisLayer() {
        const timeAxisLayer = new TimeGraphAxis('timeGraphAxis', {
            color: this.styleConfig.naviBackgroundColor,
            lineColor: this.styleConfig.lineColor
        });
        return timeAxisLayer;
    }

    protected getAxisCursors() {
        return new TimeGraphAxisCursors('timeGraphAxisCursors', { color: this.styleConfig.cursorColor });
    }

    protected getChartContainer() {
        const grid = new TimeGraphChartGrid('timeGraphGrid', this.rowHeight, this.styleConfig.lineColor);

        const cursors = new TimeGraphChartCursors('chart-cursors', this.chartLayer, this.rowController, { color: this.styleConfig.cursorColor });
        const selectionRange = new TimeGraphChartSelectionRange('chart-selection-range', { color: this.styleConfig.cursorColor });

        return <ReactTimeGraphContainer
            options={
                {
                    id: 'timegraph-chart',
                    height: this.styleConfig.mainHeight,
                    width: this.styleConfig.mainWidth,
                    backgroundColor: this.styleConfig.chartBackgroundColor,
                    classNames: 'horizontal-canvas'
                }
            }
            onWidgetResize={this.addWidgetResizeHandler}
            unitController={this.unitController}
            id='timegraph-chart'
            layer={[
                grid, this.chartLayer, selectionRange, cursors
            ]}
        >
        </ReactTimeGraphContainer>;
    }

    protected getNaviContainer() {
        const navi = new TimeGraphNavigator('timeGraphNavigator');
        return <ReactTimeGraphContainer
            id='navi'
            options={{
                width: this.styleConfig.mainWidth,
                height: 10,
                id: 'navi',
                backgroundColor: this.styleConfig.naviBackgroundColor,
                classNames: 'horizontal-canvas'
            }}
            onWidgetResize={this.addWidgetResizeHandler}
            unitController={this.unitController}
            layer={[navi]}
        ></ReactTimeGraphContainer>
    }

    protected getVerticalScrollbar() {
        return <ReactTimeGraphContainer
            id='vscroll'
            options={{
                id: 'vscroll',
                width: 10,
                height: this.styleConfig.mainHeight,
                backgroundColor: this.styleConfig.naviBackgroundColor
            }}
            onWidgetResize={this.addWidgetResizeHandler}
            unitController={this.unitController}
            layer={[this.vscrollLayer]}
        ></ReactTimeGraphContainer>;
    }
}

export namespace ReactTimeGraphContainer {
    export interface Props {
        id: string,
        options: TimeGraphContainerOptions,
        unitController: TimeGraphUnitController,
        layer: TimeGraphLayer[],
        onWidgetResize: (handler: () => void) => void
    }
}

export class ReactTimeGraphContainer extends React.Component<ReactTimeGraphContainer.Props> {
    protected ref: HTMLCanvasElement | undefined;
    protected container?: TimeGraphContainer;

    componentDidMount() {
        this.container = new TimeGraphContainer(this.props.options, this.props.unitController, this.ref);
        this.props.layer.forEach(l => {
            this.container && this.container.addLayer(l);
        });

        this.props.onWidgetResize(() => {
            this.container && this.container.reInitCanvasSize(this.props.options.width);
        })
    }

    render() {
        return <canvas ref={ref => this.ref = ref || undefined} onWheel={e => e.preventDefault()}></canvas>
    }
}