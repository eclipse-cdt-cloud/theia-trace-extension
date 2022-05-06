import React from 'react';
import { AbstractOutputProps } from './abstract-output-component';
import { XYOutputOverviewComponent } from './xy-output-overview-component';

export class TraceOverviewComponent extends React.Component<AbstractOutputProps> {
    constructor(props: AbstractOutputProps){
        super(props);
    }

    render(): JSX.Element {
        if (this.props.outputDescriptor.id === 'org.eclipse.tracecompass.internal.tmf.core.histogram.HistogramDataProvider')
        {
            return <XYOutputOverviewComponent {...this.props}></XYOutputOverviewComponent>;
        }

        return <div>No overview for this view is available</div>;
    }
}
