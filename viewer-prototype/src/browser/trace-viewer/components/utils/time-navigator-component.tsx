import * as React from 'react';
import { ReactTimeGraphContainer } from './timegraph-container-component';
import { TimeGraphUnitController } from 'timeline-chart/lib/time-graph-unit-controller';
import { TimeGraphNavigator } from 'timeline-chart/lib/layer/time-graph-navigator';

interface TimeNavigatorProps {
    unitController: TimeGraphUnitController;
    style: {
        chartWidth: number,
        naviBackgroundColor: number,
        cursorColor: number,
        lineColor: number
    };
    addWidgetResizeHandler: (handler: () => void) => void;
}

export class TimeNavigatorComponent extends React.Component<TimeNavigatorProps> {
    render() {
        const navi = new TimeGraphNavigator('timeGraphNavigator');
        return <ReactTimeGraphContainer
            id='time-navigator'
            options={{
                width: this.props.style.chartWidth,
                height: 10,
                id: 'time-navigator',
                backgroundColor: this.props.style.naviBackgroundColor,
                classNames: 'horizontal-canvas'
            }}
            onWidgetResize={this.props.addWidgetResizeHandler}
            unitController={this.props.unitController}
            layer={[navi]} />;
    }
}
