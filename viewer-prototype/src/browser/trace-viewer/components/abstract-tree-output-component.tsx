import { AbstractOutputComponent, AbstractOutputProps, AbstractOutputState } from './abstract-output-component';
import * as React from 'react';


export abstract class AbstractTreeOutputComponent<P extends AbstractOutputProps, S extends AbstractOutputState> extends AbstractOutputComponent<P, S> {
    renderMainArea(): React.ReactNode {
        const treeWidth = this.props.style.width - this.props.style.chartWidth - this.getHandleWidth();
        return <React.Fragment>
            <div className='output-component-tree' style={{ width: treeWidth, height: this.props.style.height }}>
                {this.renderTree()}
            </div>
            <div className='output-component-chart' style={{ width: this.props.style.chartWidth, backgroundColor: '#3f3f3f' }}>
                {this.renderChart()}
            </div>
        </React.Fragment>;
    }

    abstract renderTree(): React.ReactNode;

    abstract renderChart(): React.ReactNode;
}