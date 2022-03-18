import * as React from 'react';
import { ReactTimeGraphContainer } from './timegraph-container-component';
import { TimeGraphUnitController } from 'timeline-chart/lib/time-graph-unit-controller';
import { TimeGraphNavigator } from 'timeline-chart/lib/layer/time-graph-navigator';

interface TimeNavigatorProps {
    unitController: TimeGraphUnitController;
    style: {
        width: number,
        naviBackgroundColor: number,
        cursorColor: number,
        lineColor: number
    };
    addWidgetResizeHandler: (handler: () => void) => void;
    removeWidgetResizeHandler: (handler: () => void) => void;
}

export class TimeNavigatorComponent extends React.Component<TimeNavigatorProps> {
    render(): JSX.Element {
        const navi = new TimeGraphNavigator('timeGraphNavigator');
        return <ReactTimeGraphContainer
            id='time-navigator'
            options={{
                id: 'time-navigator',
                width: this.props.style.width,
                height: 10,
                backgroundColor: this.props.style.naviBackgroundColor,
                classNames: 'horizontal-canvas'
            }}
            addWidgetResizeHandler={this.props.addWidgetResizeHandler}
            removeWidgetResizeHandler={this.props.removeWidgetResizeHandler}
            unitController={this.props.unitController}
            layers={[navi]} />;
    }
}
