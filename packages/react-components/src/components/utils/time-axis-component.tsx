import * as React from 'react';
import { TimeGraphAxis } from 'timeline-chart/lib/layer/time-graph-axis';
import { TimeGraphAxisCursors } from 'timeline-chart/lib/layer/time-graph-axis-cursors';
import { ReactTimeGraphContainer } from './timegraph-container-component';
import { TimeGraphUnitController } from 'timeline-chart/lib/time-graph-unit-controller';

interface TimeAxisProps {
    unitController: TimeGraphUnitController;
    style: {
        chartWidth: number,
        naviBackgroundColor: number,
        cursorColor: number,
        lineColor: number
    };
    addWidgetResizeHandler: (handler: () => void) => void;
}

export class TimeAxisComponent extends React.Component<TimeAxisProps> {
    render(): JSX.Element {
        return <ReactTimeGraphContainer
            id='timegraph-axis'
            options={{
                id: 'timegraph-axis',
                height: 30,
                width: this.props.style.chartWidth,
                backgroundColor: 0xFFFFFF,
                classNames: 'horizontal-canvas'
            }}
            onWidgetResize={this.props.addWidgetResizeHandler}
            unitController={this.props.unitController}
            layer={[this.getAxisLayer(), this.getAxisCursors()]} />;
    }

    protected getAxisLayer(): TimeGraphAxis {
        const timeAxisLayer = new TimeGraphAxis('timeGraphAxis', {
            color: this.props.style.naviBackgroundColor,
            lineColor: this.props.style.lineColor
        });
        return timeAxisLayer;
    }

    protected getAxisCursors(): TimeGraphAxisCursors {
        return new TimeGraphAxisCursors('timeGraphAxisCursors', { color: this.props.style.cursorColor });
    }
}
