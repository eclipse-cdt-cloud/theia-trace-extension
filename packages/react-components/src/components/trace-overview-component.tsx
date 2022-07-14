import React from 'react';
import { AbstractOutputProps } from './abstract-output-component';
import { XYOutputOverviewComponent } from './xy-output-overview-component';

export class TraceOverviewComponent extends React.Component<AbstractOutputProps> {
    constructor(props: AbstractOutputProps){
        super(props);
    }

    render(): JSX.Element {
        return <XYOutputOverviewComponent key={this.props.outputDescriptor.id} {...this.props}></XYOutputOverviewComponent>;
    }
}
