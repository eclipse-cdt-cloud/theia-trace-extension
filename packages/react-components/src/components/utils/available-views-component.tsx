import { ListRowProps, AutoSizer, List } from 'react-virtualized';
import React from 'react';
import { OutputDescriptor } from 'tsp-typescript-client/lib/models/output-descriptor';

export interface AvailableViewsComponentProps {
    availableViewListKey: number,
    outputDescriptors: OutputDescriptor[],
    onContextMenuEvent?: (event: React.MouseEvent<HTMLDivElement, MouseEvent>, output: OutputDescriptor | undefined) => void,
    onOutputClicked: (event: React.MouseEvent<HTMLDivElement>) => void
}

export interface AvailableViewsComponentState {
    lastSelectedOutputIndex: number;
}

export class AvailableViewsComponent  extends React.Component<AvailableViewsComponentProps, AvailableViewsComponentState>{
    static LIST_MARGIN = 2;
    static LINE_HEIGHT = 16;
    static ROW_HEIGHT = (2 * AvailableViewsComponent.LINE_HEIGHT) + AvailableViewsComponent.LIST_MARGIN;

    protected handleOutputClicked = (e: React.MouseEvent<HTMLDivElement>): void => this.doHandleOutputClicked(e);

    constructor(props: AvailableViewsComponentProps){
        super(props);
        this.state = { lastSelectedOutputIndex: -1 };
    }

    render(): React.ReactNode {
        let outputsRowCount = 0;
        const outputs = this.props.outputDescriptors;
        if (outputs) {
            outputsRowCount = outputs.length;
        }
        const totalHeight = this.getTotalHeight();
        return (
            <div className='trace-explorer-views'>
                <div className='trace-explorer-panel-content disable-select' style={{height: totalHeight}}>
                    <AutoSizer>
                        {({ width }) =>
                            <List
                                key={this.props.availableViewListKey}
                                height={totalHeight}
                                width={width}
                                rowCount={outputsRowCount}
                                rowHeight={AvailableViewsComponent.ROW_HEIGHT}
                                rowRenderer={this.renderRowOutputs}
                            />
                        }
                    </AutoSizer>
                </div>
            </div>
        );
    }

    protected renderRowOutputs = (props: ListRowProps): React.ReactNode => this.doRenderRowOutputs(props);

    private doRenderRowOutputs(props: ListRowProps): React.ReactNode {
        let outputName = '';
        let outputDescription = '';
        let output: OutputDescriptor | undefined;
        const outputDescriptors = this.props.outputDescriptors;
        if (outputDescriptors && outputDescriptors.length && props.index < outputDescriptors.length) {
            output = outputDescriptors[props.index];
            outputName = output.name;
            outputDescription = output.description;
        }
        let traceContainerClassName = 'outputs-list-container';
        if (props.index === this.state.lastSelectedOutputIndex) {
            traceContainerClassName = traceContainerClassName + ' theia-mod-selected';
        }
        return <div className={traceContainerClassName}
            title={outputName + ':\n' + outputDescription}
            id={`${traceContainerClassName}-${props.index}`}
            key={props.key}
            style={props.style}
            onClick={this.handleOutputClicked}
            onContextMenu={event => { this.doHandleContextMenuEvent(event, output); }}
            data-id={`${props.index}`}
        >
            <h4 className='outputs-element-name'>
                {outputName}
            </h4>
            <div className='outputs-element-description child-element'>
                {outputDescription}
            </div>
        </div>;
    }

    private doHandleContextMenuEvent(event: React.MouseEvent<HTMLDivElement, MouseEvent>, output: OutputDescriptor | undefined) {
        if (this.props.onContextMenuEvent)
            {this.props.onContextMenuEvent(event, output);}
    }

    private doHandleOutputClicked(e: React.MouseEvent<HTMLDivElement>) {
        const index = Number(e.currentTarget.getAttribute('data-id'));
        this.setState({ lastSelectedOutputIndex: index });

        this.props.onOutputClicked(e);
    }

    protected getTotalHeight(): number {
        let totalHeight = 0;
        const outputDescriptors = this.props.outputDescriptors;
        outputDescriptors?.forEach(() => totalHeight += AvailableViewsComponent.ROW_HEIGHT);
        return totalHeight;
    }
}
