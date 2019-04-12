import { AbstractOutputComponent, AbstractOutputProps, AbstractOutputState } from "./abstract-output-component";
import * as React from 'react';
import { ReactTimeGraphContainer } from "./utils/timegraph-container-component";
import { TimeGraphChartGrid } from 'timeline-chart/lib/layer/time-graph-chart-grid';
import { TimeGraphChartCursors } from 'timeline-chart/lib/layer/time-graph-chart-cursors';
import { TimeGraphChartSelectionRange } from 'timeline-chart/lib/layer/time-graph-chart-selection-range';
import { TimeGraphNavigator } from 'timeline-chart/lib/layer/time-graph-navigator';
import { TimeGraphRowController } from "timeline-chart/lib/time-graph-row-controller";
import { TimeGraphChart, TimeGraphChartProviders } from "timeline-chart/lib/layer/time-graph-chart";
import { TimeGraphVerticalScrollbar } from 'timeline-chart/lib/layer/time-graph-vertical-scrollbar';
import { TimelineChart } from "timeline-chart/lib/time-graph-model";
import { TimeGraphRowElementStyle } from "timeline-chart/lib/components/time-graph-row-element";
import { QueryHelper } from "tsp-typescript-client/lib/models/query/query-helper";
import { TimeGraphEntry } from "tsp-typescript-client/lib/models/timegraph";
import { EntryHeader } from "tsp-typescript-client/lib/models/entry";
import { TspDataProvider } from './data-providers/tsp-data-provider';

type TimegraphOutputProps = AbstractOutputProps & {
    style: {
        mainWidth: number,
        mainHeight: number,
        naviBackgroundColor: number,
        chartBackgroundColor: number,
        cursorColor: number,
        lineColor: number,
        rowHeight: number
    };
    addWidgetResizeHandler: (handler: () => void) => void;
}

export class TimegraphOutputComponent extends AbstractOutputComponent<TimegraphOutputProps, AbstractOutputState> {
    private totalHeight: number = 0;
    private rowController: TimeGraphRowController;
    private chartLayer: TimeGraphChart;
    private vscrollLayer: TimeGraphVerticalScrollbar;
    private horizontalContainer: React.RefObject<HTMLDivElement>;

    private tspDataProvider: TspDataProvider;
    private styleMap = new Map<string, TimeGraphRowElementStyle>();

    constructor(props: TimegraphOutputProps) {
        super(props);
        this.tspDataProvider = new TspDataProvider(this.props.tspClient, this.props.traceId, this.props.outputDescriptor.id);
        this.rowController = new TimeGraphRowController(this.props.style.rowHeight, this.totalHeight);
        this.horizontalContainer = React.createRef();
        const providers: TimeGraphChartProviders = {
            dataProvider: async (range: TimelineChart.TimeGraphRange, resolution: number) => {
                return this.fetchTimegraphData(range, resolution);
            },
            rowElementStyleProvider: (model: TimelineChart.TimeGraphRowElementModel) => {
                return this.getElementStyle(model);
            },
            rowStyleProvider: (row: TimelineChart.TimeGraphRowModel) => {
                return {
                    backgroundColor: 0x979797,// 0xaaaaff,
                    backgroundOpacity: row.selected ? 0.1 : 0,
                    lineColor: 0xdddddd, // hasStates ? 0xdddddd : 0xaa4444, // row.data && row.data.hasStates
                    lineThickness: 1, // hasStates ? 1 : 3 // row.data && row.data.hasStates
                }
            }
        };
        this.chartLayer = new TimeGraphChart('timeGraphChart', providers, this.rowController);
        this.vscrollLayer = new TimeGraphVerticalScrollbar('timeGraphVerticalScrollbar', this.rowController);

        this.initialize();
    }

    private async initialize() {
        const treeParameters = QueryHelper.timeQuery([0, 1]);
        const treeResponse = await this.props.tspClient.fetchTimeGraphTree<TimeGraphEntry, EntryHeader>(this.props.traceId,
            this.props.outputDescriptor.id, treeParameters);
        const nbEntries = treeResponse.model.entries.length;
        this.totalHeight = nbEntries * this.props.style.rowHeight;
        this.rowController.totalHeight = this.totalHeight;
    }

    renderMainArea(): React.ReactNode {
        return <div className='timegraph-output-container'>
            <div className='timegraph-tree'>
            </div>
            <div id='timegraph-main' className='ps__child--consume' onWheel={ev => { ev.preventDefault(); ev.stopPropagation(); }} >
                {this.renderTimeGraphContent()}
                <div id='main-vscroll'>
                    {this.getVerticalScrollbar()}
                </div>
            </div>
        </div>;
    }

    private renderTimeGraphContent() {
        return <div id='main-timegraph-content' ref={this.horizontalContainer}>
            {this.getChartContainer()}
            {this.getNaviContainer()}
        </div>
    }

    private getChartContainer() {
        const grid = new TimeGraphChartGrid('timeGraphGrid', this.props.style.rowHeight, this.props.style.lineColor);

        const cursors = new TimeGraphChartCursors('chart-cursors', this.chartLayer, this.rowController, { color: this.props.style.cursorColor });
        const selectionRange = new TimeGraphChartSelectionRange('chart-selection-range', { color: this.props.style.cursorColor });

        return <ReactTimeGraphContainer
            options={
                {
                    id: 'timegraph-chart',
                    height: this.props.style.mainHeight,
                    width: this.props.style.mainWidth,
                    backgroundColor: this.props.style.chartBackgroundColor,
                    classNames: 'horizontal-canvas'
                }
            }
            onWidgetResize={this.props.addWidgetResizeHandler}
            unitController={this.props.unitController}
            id='timegraph-chart'
            layer={[
                grid, this.chartLayer, selectionRange, cursors
            ]}
        >
        </ReactTimeGraphContainer>;
    }

    private getNaviContainer() {
        const navi = new TimeGraphNavigator('timeGraphNavigator');
        return <ReactTimeGraphContainer
            id='navi'
            options={{
                width: this.props.style.mainWidth,
                height: 10,
                id: 'navi',
                backgroundColor: this.props.style.naviBackgroundColor,
                classNames: 'horizontal-canvas'
            }}
            onWidgetResize={this.props.addWidgetResizeHandler}
            unitController={this.props.unitController}
            layer={[navi]}
        ></ReactTimeGraphContainer>
    }

    protected getVerticalScrollbar() {
        return <ReactTimeGraphContainer
            id='vscroll'
            options={{
                id: 'vscroll',
                width: 10,
                height: this.props.style.mainHeight,
                backgroundColor: this.props.style.naviBackgroundColor
            }}
            onWidgetResize={this.props.addWidgetResizeHandler}
            unitController={this.props.unitController}
            layer={[this.vscrollLayer]}
        ></ReactTimeGraphContainer>;
    }

    private async fetchTimegraphData(range: TimelineChart.TimeGraphRange, resolution: number) {
        const length = range.end - range.start;
        const overlap = ((length * 5) - length) / 2;
        const start = range.start - overlap > 0 ? range.start - overlap : 0;
        const end = range.end + overlap < this.props.unitController.absoluteRange ? range.end + overlap : this.props.unitController.absoluteRange;
        const newRange: TimelineChart.TimeGraphRange = { start, end };
        const newResolution: number = resolution * 0.8;
        const timeGraphData: TimelineChart.TimeGraphModel = await this.tspDataProvider.getData(newRange, newResolution);
        // if (timeGraphData && selectedElement) {
        //     for (const row of timeGraphData.rows) {
        //         const selEl = row.states.find(el => !!selectedElement && el.id === selectedElement.id);
        //         if (selEl) {
        //             selEl.selected = true;
        //             break;
        //         }
        //     }
        // }
        return {
            rows: timeGraphData ? timeGraphData.rows : [],
            range: newRange,
            resolution: newResolution
        };
    }

    private getElementStyle(element: TimelineChart.TimeGraphRowElementModel) {
        const styles: TimeGraphRowElementStyle[] = [
            {
                color: 0x3891A6,
                height: this.props.style.rowHeight * 0.8
            }, {
                color: 0x4C5B5C,
                height: this.props.style.rowHeight * 0.7
            }, {
                color: 0xFDE74C,
                height: this.props.style.rowHeight * 0.6
            }, {
                color: 0xDB5461,
                height: this.props.style.rowHeight * 0.5
            }, {
                color: 0xE3655B,
                height: this.props.style.rowHeight * 0.4
            }, {
                color: 0xEA8F87,
                height: this.props.style.rowHeight * 0.9
            }, {
                color: 0xDE636F,
                height: this.props.style.rowHeight * 0.3
            },
        ];
        let style: TimeGraphRowElementStyle | undefined = styles[0];
        const val = element.label;
        const modelData = element.data;
        if (modelData) {
            const value = modelData.stateValue;
            if(value === -1) {
                return {
                    color: 0xCACACA,
                    height: this.props.style.rowHeight * 0.5,
                    borderWidth: element.selected ? 2 : 0,
                    borderColor: 0xeef20c
                };
            }
            style = this.styleMap.get(value);
            if (!style) {
                style = styles[(value % styles.length)];
                this.styleMap.set(value, style);
            }
            return {
                color: style.color,
                height: style.height,
                borderWidth: element.selected ? 2 : 0,
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
            borderWidth: element.selected ? 2 : 0,
            borderColor: 0xeef20c
        };
    }

}