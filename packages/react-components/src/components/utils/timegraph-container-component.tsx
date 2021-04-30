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
        addWidgetResizeHandler: (handler: () => void) => void
        removeWidgetResizeHandler: (handler: () => void) => void
    }
}

export class ReactTimeGraphContainer extends React.Component<ReactTimeGraphContainer.Props> {
    protected ref: HTMLCanvasElement | undefined;
    protected container?: TimeGraphContainer;

    private _resizeHandler: { (): void; (): void; (): void; } | undefined;

    componentDidMount(): void {
        this.container = new TimeGraphContainer(this.props.options, this.props.unitController, this.ref);
        this.props.layer.forEach(l => {
            if (this.container) { this.container.addLayer(l); }
        });
        this._resizeHandler = () => {
            if (this.container) { this.container.reInitCanvasSize(this.props.options.width, this.props.options.height); }
        };
        this.props.addWidgetResizeHandler(this._resizeHandler);
    }

    componentWillUnmount(): void {
        if (this.container) {
            this.container.destroy();
        }

        if (this._resizeHandler) {
            this.props.removeWidgetResizeHandler(this._resizeHandler);
        }
    }

    shouldComponentUpdate(nextProps: ReactTimeGraphContainer.Props): boolean {
        return nextProps.options.height !== this.props.options.height
            || nextProps.options.width !== this.props.options.width;
    }

    componentDidUpdate(prevProps: ReactTimeGraphContainer.Props): void {
        if (prevProps.options.height !== this.props.options.height && this.container) {
            this.container.reInitCanvasSize(this.props.options.width, this.props.options.height);
        }
    }

    render(): JSX.Element {
        return <canvas ref={ ref => this.ref = ref || undefined } onWheel={ e => e.preventDefault() } tabIndex={ 1 }></canvas>;
    }
}
