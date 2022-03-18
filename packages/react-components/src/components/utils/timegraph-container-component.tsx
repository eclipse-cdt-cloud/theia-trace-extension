import * as React from 'react';
import { TimeGraphContainer, TimeGraphContainerOptions } from 'timeline-chart/lib/time-graph-container';
import { TimeGraphUnitController } from 'timeline-chart/lib/time-graph-unit-controller';
import { TimeGraphLayer } from 'timeline-chart/lib/layer/time-graph-layer';
import { debounce } from 'lodash';

export namespace ReactTimeGraphContainer {
    export interface Props {
        id: string,
        options: TimeGraphContainerOptions,
        unitController: TimeGraphUnitController,
        layers: TimeGraphLayer[],
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
        if (this.container) {
            this.container.addLayers(this.props.layers);
        }
        this._resizeHandler = debounce(() => this.resize(), 500, { trailing: true, leading: false });
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
            || nextProps.options.width !== this.props.options.width
            || nextProps.options.backgroundColor !== this.props.options.backgroundColor;
    }

    componentDidUpdate(prevProps: ReactTimeGraphContainer.Props): void {
        if ((prevProps.options.height !== this.props.options.height
            || prevProps.options.backgroundColor !== this.props.options.backgroundColor)
            && this.container) {
            this.container.updateCanvas(this.props.options.width, this.props.options.height, this.props.options.backgroundColor, this.props.options.lineColor);
        }
    }

    render(): JSX.Element {
        return <canvas ref={ ref => this.ref = ref || undefined } onWheel={ e => e.preventDefault() } tabIndex={ 0 }></canvas>;
    }

    private resize(): void {
        if (this.container) {
            this.container.updateCanvas(this.props.options.width, this.props.options.height, this.props.options.backgroundColor, this.props.options.lineColor);
        }
    }
}
