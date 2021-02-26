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
        const treeWidth = this.props.widthWPBugWorkaround - this.props.style.chartWidth;
        const componentHeight = parseInt(this.props.style.height.toString()) - this.getHandleHeight();
        return <React.Fragment>
            <div className='output-component-tree'
                style={{ width: treeWidth, height: componentHeight }}
            >
                {''}
            </div>
            <div className='output-component-chart' style={{ fontSize: 24, width: this.props.style.chartWidth, height: componentHeight, backgroundColor: '#3f3f3f', }}>
                {'Not implemented yet!'}
            </div>
        </React.Fragment>;
    }
}
