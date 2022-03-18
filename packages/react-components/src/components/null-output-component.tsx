import * as React from 'react';
import { AbstractOutputComponent, AbstractOutputProps, AbstractOutputState } from './abstract-output-component';

type NullOutputState = AbstractOutputState & {
};

type NullOutputProps = AbstractOutputProps & {
};

export class NullOutputComponent extends AbstractOutputComponent<NullOutputProps, NullOutputState> {
    constructor(props: NullOutputProps) {
        super(props);
    }

    renderMainArea(): React.ReactNode {
        const treeWidth = Math.min(this.getMainAreaWidth(), this.props.style.chartOffset - this.getHandleWidth());
        const chartWidth = this.getMainAreaWidth() - treeWidth;
        return <React.Fragment>
            <div className='output-component-tree disable-select'
                style={{ width: treeWidth, height: this.props.style.height }}
            >
                {''}
            </div>
            <div className='output-component-chart' style={{ fontSize: 24, width: chartWidth, height: this.props.style.height, backgroundColor: '#3f3f3f', }}>
                {'Not implemented yet!'}
            </div>
        </React.Fragment>;
    }

    resultsAreEmpty(): boolean {
        return true;
    }

    setFocus(): void {
        return;
    }
  }
