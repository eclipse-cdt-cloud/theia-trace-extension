import { AbstractOutputComponent, AbstractOutputProps, AbstractOutputState } from './abstract-output-component';
import * as React from 'react';
import { ResponseStatus } from 'tsp-typescript-client/lib/models/response/responses';

export abstract class AbstractTreeOutputComponent<P extends AbstractOutputProps, S extends AbstractOutputState> extends AbstractOutputComponent<P, S> {
    renderMainArea(): React.ReactNode {
        const treeWidth = this.props.widthWPBugWorkaround - this.getHandleWidth() - this.props.style.chartWidth;
        return <React.Fragment>
            <div ref={this.treeRef} className='output-component-tree'
                onScroll={_ev => { this.synchronizeTreeScroll(); }}
                style={{ width: treeWidth, height: this.props.style.height }}
            >
                {this.renderTree()}
            </div>
            <div className='output-component-chart' style={{
                width: this.props.style.chartWidth, height: this.props.style.height,
                backgroundColor: '#' + this.props.style.chartBackgroundColor.toString(16)
            }}>
                {this.renderChart()}
            </div>
        </React.Fragment>;
    }

    treeRef: React.RefObject<HTMLDivElement> = React.createRef();

    abstract renderTree(): React.ReactNode;

    abstract renderChart(): React.ReactNode;

    abstract synchronizeTreeScroll(): void;

    abstract fetchTree(): Promise<ResponseStatus>;

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
}
