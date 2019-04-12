import * as React from 'react';
import { OutputDescriptor } from 'tsp-typescript-client/lib/models/output-descriptor';
import { TspClient } from 'tsp-typescript-client/lib/protocol/tsp-client';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes } from '@fortawesome/free-solid-svg-icons';
import { TimeGraphUnitController } from 'timeline-chart/lib/time-graph-unit-controller';

export type AbstractOutputProps = {
    tspClient: TspClient;
    traceId: string;
    range: number[];
    viewRange: number[];
    resolution?: number;
    outputDescriptor: OutputDescriptor;
    onOutputRemove: (outputId: string) => void;
    // TODO Not sure
    unitController: TimeGraphUnitController;
}

export type AbstractOutputState = {
    outputStatus: string;
}

export abstract class AbstractOutputComponent<P extends AbstractOutputProps, S extends AbstractOutputState> extends React.Component<P, S> {

    render() {
        this.closeComponent = this.closeComponent.bind(this);
        return <div className='output-container'>
            <div className='widget-handle'>
                {this.renderTitleBar()}
            </div>
            <div className='main-output-container'>
                {this.renderMainArea()}
            </div>
        </div>;
    }

    renderTitleBar(): React.ReactNode {
        let outputName = this.props.outputDescriptor.name;
        return <React.Fragment>
            <button className='remove-component-button' onClick={this.closeComponent}>
                <FontAwesomeIcon icon={faTimes} />
            </button>
            <div className='title-bar-label'>
                {outputName}
            </div>
        </React.Fragment>;
    }

    private closeComponent() {
        this.props.onOutputRemove(this.props.outputDescriptor.id);
    }

    abstract renderMainArea(): React.ReactNode;
}