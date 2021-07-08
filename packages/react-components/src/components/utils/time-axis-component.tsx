import * as React from 'react';
import { TimeGraphAxis } from 'timeline-chart/lib/layer/time-graph-axis';
import { TimeGraphAxisCursors } from 'timeline-chart/lib/layer/time-graph-axis-cursors';
import { ReactTimeGraphContainer } from './timegraph-container-component';
import { TimeGraphUnitController } from 'timeline-chart/lib/time-graph-unit-controller';
import { OutputComponentStyle } from './output-component-style';

interface TimeAxisProps {
    unitController: TimeGraphUnitController;
    style: OutputComponentStyle;
    addWidgetResizeHandler: (handler: () => void) => void;
    removeWidgetResizeHandler: (handler: () => void) => void;
}

export class TimeAxisComponent extends React.Component<TimeAxisProps> {
    render(): JSX.Element {
        return <ReactTimeGraphContainer
            id='timegraph-axis'
            options={{
                id: 'timegraph-axis',
                height: 30,
                width: this.props.style.chartWidth,
                backgroundColor: this.props.style.chartBackgroundColor,
                lineColor: this.props.style.lineColor,
                classNames: 'horizontal-canvas'
            }}
            addWidgetResizeHandler={this.props.addWidgetResizeHandler}
            removeWidgetResizeHandler={this.props.removeWidgetResizeHandler}
            unitController={this.props.unitController}
            layers={[this.getAxisLayer(), this.getAxisCursors()]} />;
    }

    protected getAxisLayer(): TimeGraphAxis {
        const timeAxisLayer = new TimeGraphAxis('timeGraphAxis', {
            color: this.props.style.chartBackgroundColor,
            lineColor: this.props.style.lineColor
        });
        return timeAxisLayer;
    }

    protected getAxisCursors(): TimeGraphAxisCursors {
        return new TimeGraphAxisCursors('timeGraphAxisCursors', { color: this.props.style.cursorColor });
    }
}
