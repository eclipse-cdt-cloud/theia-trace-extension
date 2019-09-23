import * as React from 'react';
import { OutputDescriptor } from 'tsp-typescript-client/lib/models/output-descriptor';
import { TspClient } from 'tsp-typescript-client/lib/protocol/tsp-client';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes } from '@fortawesome/free-solid-svg-icons';
import { TimeGraphUnitController } from 'timeline-chart/lib/time-graph-unit-controller';
import { TimeRange } from '../../../common/utils/time-range';
import { OutputComponentStyle } from './utils/output-component-style';
import { OutputStyleModel } from 'tsp-typescript-client/lib/models/styles';

export type AbstractOutputProps = {
    tspClient: TspClient;
    traceId: string;
    range: TimeRange;
    viewRange: TimeRange;
    selectionRange: TimeRange | undefined;
    resolution?: number;
    outputDescriptor: OutputDescriptor;
    style: OutputComponentStyle;
    onOutputRemove: (outputId: string) => void;
    // TODO Not sure
    unitController: TimeGraphUnitController;
    onSelectionRangeChange?: () => void;
    onViewRangeChange?: () => void;
}

export type AbstractOutputState = {
    outputStatus: string;
    styleModel?: OutputStyleModel
}

export abstract class AbstractOutputComponent<P extends AbstractOutputProps, S extends AbstractOutputState> extends React.Component<P, S> {

    private mainAreaContainer: React.RefObject<HTMLDivElement>;
    private handleWidth: number = 30;

    constructor(props: P) {
        super(props);
        this.mainAreaContainer = React.createRef();
    }

    render() {
        this.closeComponent = this.closeComponent.bind(this);
        return <div className='output-container' style={{ width: this.props.style.width }}>
            <div className='widget-handle' style={{ width: this.handleWidth }}>
                {this.renderTitleBar()}
            </div>
            <div className='main-output-container' ref={this.mainAreaContainer} style={{ width: this.props.style.width - this.handleWidth }}>
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

    public getMainAreaWidth(): number {
        if (this.mainAreaContainer.current) {
            return this.mainAreaContainer.current.clientWidth;
        }
        return 1000;
    }

    public getHandleWidth(): number {
        return this.handleWidth;
    }

    abstract renderMainArea(): React.ReactNode;
}