import { AbstractOutputComponent, AbstractOutputProps, AbstractOutputState } from './abstract-output-component';
import * as React from 'react';
import { ResponseStatus } from 'tsp-typescript-client/lib/models/response/responses';

export abstract class AbstractTreeOutputComponent<P extends AbstractOutputProps, S extends AbstractOutputState> extends AbstractOutputComponent<P, S> {

    private readonly DEFAULT_Y_AXIS_WIDTH = 40;
    private readonly DEFAULT_SASH_WIDTH = 4;

    private sashDownX = -1;
    private sashDownOffset = -1;

    constructor(props: P) {
        super(props);
        this.onSashDown = this.onSashDown.bind(this);
        this.onSashMove = this.onSashMove.bind(this);
        this.onSashUp = this.onSashUp.bind(this);
    }

    renderMainArea(): React.ReactNode {
        return <React.Fragment>
            <div ref={this.treeRef} className='output-component-tree disable-select'
                style={{ width: this.getTreeWidth(), height: this.props.style.height }}
            >
                {this.renderTree()}
            </div>
            <div className='output-component-y-axis' style={{
                height: this.props.style.height,
                backgroundColor: '#' + this.props.style.chartBackgroundColor.toString(16)
            }}>
                {this.renderYAxis()}
            </div>
            <div className='output-component-sash' onMouseDown={event => this.onSashDown(event)} style={{
                width: this.getSashWidth(), height: this.props.style.height
            }}/>
            <div className='output-component-chart' style={{
                width: this.getChartWidth(), height: this.props.style.height,
                backgroundColor: '#' + this.props.style.chartBackgroundColor.toString(16)
            }}>
                {this.renderChart()}
            </div>
        </React.Fragment>;
    }

    private onSashDown(event: React.MouseEvent<HTMLDivElement, MouseEvent>): void {
        this.sashDownX = event.clientX;
        this.sashDownOffset = this.props.style.chartOffset;
        window.addEventListener('mousemove', this.onSashMove);
        window.addEventListener('mouseup', this.onSashUp);
}

    private onSashMove(ev: MouseEvent): void {
        if (this.sashDownX !== -1 && this.props?.setChartOffset) {
            const chartOffset = Math.max(this.sashDownOffset + (ev.clientX - this.sashDownX),
                this.getHandleWidth() + this.getYAxisWidth() + this.getSashWidth());
            this.props.setChartOffset(chartOffset);
            ev.preventDefault();
        }
    }

    private onSashUp(_ev: MouseEvent): void {
        this.sashDownX = -1;
        this.sashDownOffset = -1;
        window.removeEventListener('mousemove', this.onSashMove);
        window.removeEventListener('mouseup', this.onSashUp);
    }

    treeRef: React.RefObject<HTMLDivElement> = React.createRef();

    abstract renderTree(): React.ReactNode;

    abstract renderYAxis(): React.ReactNode;

    abstract renderChart(): React.ReactNode;

    abstract fetchTree(): Promise<ResponseStatus>;

    abstract resultsAreEmpty(): boolean;

    protected async waitAnalysisCompletion(): Promise<void> {
        let outputStatus = this.state.outputStatus;
        const timeout = 500;
        while (this.state && outputStatus === ResponseStatus.RUNNING) {
            outputStatus = await this.fetchTree();
            await new Promise(resolve => setTimeout(resolve, timeout));
        }
    }

    componentWillUnmount(): void {
        // fix Warning: Can't perform a React state update on an unmounted component
        this.setState = (_state, _callback) => undefined;

    }

    protected getYAxisWidth(): number {
        return this.props.style.yAxisWidth || this.DEFAULT_Y_AXIS_WIDTH;
    }

    protected getSashWidth(): number {
        return this.props.style.sashWidth || this.DEFAULT_SASH_WIDTH;
    }

    public getTreeWidth(): number {
        // Make tree thinner when chart has a y-axis
        const yAxisWidth = this.props.outputDescriptor.type === 'TREE_TIME_XY' ? this.getYAxisWidth(): 0;
        return Math.max(0, this.props.style.chartOffset - this.getHandleWidth() - yAxisWidth - this.getSashWidth());
    }

    public getChartWidth(): number {
        return Math.max(0, this.props.outputWidth - this.props.style.chartOffset);
    }
}
