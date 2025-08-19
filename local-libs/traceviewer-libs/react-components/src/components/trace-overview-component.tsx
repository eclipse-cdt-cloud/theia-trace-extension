import React from 'react';
import { Experiment } from 'tsp-typescript-client/lib/models/experiment';
import { AbstractOutputProps } from './abstract-output-component';
import { XYOutputOverviewComponent } from './xy-output-overview-component';

type XYoutputOverviewProps = AbstractOutputProps & {
    experiment: Experiment;
};

export class TraceOverviewComponent extends React.Component<XYoutputOverviewProps> {
    constructor(props: XYoutputOverviewProps) {
        super(props);
    }

    render(): JSX.Element {
        return (
            <XYOutputOverviewComponent key={this.props.outputDescriptor.id} {...this.props}></XYOutputOverviewComponent>
        );
    }
}
