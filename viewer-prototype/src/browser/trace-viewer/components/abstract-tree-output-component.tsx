import { AbstractOutputComponent, AbstractOutputProps, AbstractOutputState } from './abstract-output-component';
import * as React from 'react';
import { QueryHelper } from 'tsp-typescript-client/lib/models/query/query-helper';
import { ResponseStatus } from 'tsp-typescript-client/lib/models/response/responses';
import { Entry, EntryHeader } from 'tsp-typescript-client/lib/models/entry';


export abstract class AbstractTreeOutputComponent<P extends AbstractOutputProps, S extends AbstractOutputState> extends AbstractOutputComponent<P, S> {
    renderMainArea(): React.ReactNode {
        const treeWidth = this.props.style.width - this.props.style.chartWidth - this.getHandleWidth();
        return <React.Fragment>

        <div ref={this.treeRef} className='output-component-tree' id='componentTree' onScroll={ev=>this.ScrollSync(this.treeRef, ev.persist)} style={{ width: treeWidth, height: this.props.style.height }}>
                {this.renderTree()}
            </div>
            <div  className='output-component-chart' id="componentChart" style={{ width: this.props.style.chartWidth, backgroundColor: '#3f3f3f' }}>
                {this.renderChart()}
               
            </div>
        </React.Fragment>;
    }

    treeRef = React.createRef<any>();
    chartRef = React.createRef<any>();


    ScrollSync(el: React.RefObject<any>, event: any) {
        let Element = el.current;
        let chartElement = this.chartRef.current;
        let treeElement = this.treeRef.current;
        if (el==this.treeRef) {
            chartElement.scrollTop=Element.scrollTop;
            console.log('Scrolltop-tree', Element.scrollTop);
        } else {
            treeElement.scrollTop=Element.scrollTop;
            console.log('Scrolltop-chart', Element.scrollTop);
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