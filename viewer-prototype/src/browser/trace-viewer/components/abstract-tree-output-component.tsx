import { AbstractOutputComponent, AbstractOutputProps, AbstractOutputState } from './abstract-output-component';
import * as React from 'react';
import { QueryHelper } from 'tsp-typescript-client/lib/models/query/query-helper';
import { ResponseStatus } from 'tsp-typescript-client/lib/models/response/responses';
import { Entry, EntryHeader } from 'tsp-typescript-client/lib/models/entry';


export abstract class AbstractTreeOutputComponent<P extends AbstractOutputProps, S extends AbstractOutputState> extends AbstractOutputComponent<P, S> {
    protected treeRef = React.createRef<any>();
    protected chartRef = React.createRef<any>();
    
    renderMainArea(): React.ReactNode {
        const treeWidth = this.props.style.width - this.props.style.chartWidth - this.getHandleWidth();
        return <React.Fragment>
            <div 
                ref={this.treeRef} 
                className='output-component-tree' 
                style={{ width: treeWidth, height: this.props.style.height }}
                onScroll={event => {event.persist(); this.scrollSync(this.treeRef)}}
            >
                {this.renderTree()}
            </div>
            <div className='output-component-chart' style={{ width: this.props.style.chartWidth, backgroundColor: '#3f3f3f' }}>
                {this.renderChart()}
            </div>
        </React.Fragment>;
    }

    scrollSync(scrolledElement: React.RefObject<any>) {
        let treeElement = this.treeRef.current;
        let chartElement = this.chartRef.current;
        if (scrolledElement === this.treeRef) {
            chartElement.scrollTop = scrolledElement.current.scrollTop;
        } else {
            treeElement.scrollTop = scrolledElement.current.scrollTop;
        }
    }

    abstract renderTree(): React.ReactNode;

    abstract renderChart(): React.ReactNode;

    protected async waitAnalysisCompletion() {
        const traceUUID = this.props.traceId;
        const tspClient = this.props.tspClient;
        const outPutId = this.props.outputDescriptor.id;

        // TODO Use the output descriptor to find out if the analysis is completed
        const xyTreeParameters = QueryHelper.selectionTimeQuery(
            QueryHelper.splitRangeIntoEqualParts(this.props.range.getstart(), this.props.range.getEnd(), 1120), []);
        let xyTreeResponse = (await tspClient.fetchXYTree<Entry, EntryHeader>(traceUUID, outPutId, xyTreeParameters)).getModel();
        while (xyTreeResponse.status === ResponseStatus.RUNNING) {
            xyTreeResponse = (await tspClient.fetchXYTree<Entry, EntryHeader>(traceUUID, outPutId, xyTreeParameters)).getModel();
        }
        this.setState({
            outputStatus: xyTreeResponse.status
        });
    }
}