import * as React from 'react';
import { TimeGraphContainer, TimeGraphContainerOptions } from 'timeline-chart/lib/time-graph-container';
import { TimeGraphUnitController } from 'timeline-chart/lib/time-graph-unit-controller';
import { TimeGraphLayer } from 'timeline-chart/lib/layer/time-graph-layer';

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

    componentDidMount(): void {
        this.container = new TimeGraphContainer(this.props.options, this.props.unitController, this.ref);
        this.props.layer.forEach(l => {
            if (this.container) { this.container.addLayer(l); }
        });

        this.props.onWidgetResize(() => {
            if (this.container) { this.container.reInitCanvasSize(this.props.options.width); }
        });
    }

    render(): JSX.Element {
        return <canvas ref={ref => this.ref = ref || undefined} onWheel={e => e.preventDefault()}></canvas>;
    }
}
