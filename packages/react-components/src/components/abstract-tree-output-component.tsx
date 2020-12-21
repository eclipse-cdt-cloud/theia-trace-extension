import { AbstractOutputComponent, AbstractOutputProps, AbstractOutputState } from './abstract-output-component';
import * as React from 'react';
import { QueryHelper } from 'tsp-typescript-client/lib/models/query/query-helper';
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

    protected async waitAnalysisCompletion(): Promise<void> {
        const traceUUID = this.props.traceId;
        const tspClient = this.props.tspClient;
        const outPutId = this.props.outputDescriptor.id;

        // TODO Use the output descriptor to find out if the analysis is completed
        const xyTreeParameters = QueryHelper.selectionTimeQuery(
            QueryHelper.splitRangeIntoEqualParts(this.props.range.getstart(), this.props.range.getEnd(), 1120), []);
        let tspClientResponse = await tspClient.fetchXYTree(traceUUID, outPutId, xyTreeParameters);
        let xyTreeResponse = tspClientResponse.getModel();
        while (tspClientResponse.isOk() && xyTreeResponse && xyTreeResponse.status === ResponseStatus.RUNNING) {
            tspClientResponse = await tspClient.fetchXYTree(traceUUID, outPutId, xyTreeParameters);
            xyTreeResponse = tspClientResponse.getModel();
        }
        if (tspClientResponse.isOk() && xyTreeResponse) {
            this.setState({
                outputStatus: xyTreeResponse.status
            });
        }
    }

    componentWillUnmount(): void {
        // fix Warning: Can't perform a React state update on an unmounted component
        this.setState = (_state, _callback) => undefined;

    }
}
