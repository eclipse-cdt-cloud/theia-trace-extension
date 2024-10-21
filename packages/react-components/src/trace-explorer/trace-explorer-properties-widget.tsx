import * as React from 'react';
import '../../style/output-components-style.css';
import { signalManager } from 'traceviewer-base/lib/signals/signal-manager';
import { FilterTree } from '../components/utils/filter-tree/tree';
import { TreeNode } from '../components/utils/filter-tree/tree-node';
import { ItemPropertiesSignalPayload } from 'traceviewer-base/src/signals/item-properties-signal-payload';

export interface ReactPropertiesWidgetProps {
    id: string;
    title: string;
    handleSourcecodeLookup: (e: React.MouseEvent<HTMLParagraphElement>) => void;
}

export interface ReactPropertiesWidgetState {
    itemProperties: TreeNode[];
}

export class ReactItemPropertiesWidget extends React.Component<ReactPropertiesWidgetProps, ReactPropertiesWidgetState> {
    constructor(props: ReactPropertiesWidgetProps) {
        super(props);
        this.state = {
            itemProperties: []
        };
        signalManager().on('ITEM_PROPERTIES_UPDATED', this._onItemProperties);
    }

    componentWillUnmount(): void {
        signalManager().off('ITEM_PROPERTIES_UPDATED', this._onItemProperties);
    }

    render(): React.ReactNode {
        return (
            <div className="trace-explorer-item-properties">
                <div className="trace-explorer-panel-content">{this.renderTooltip()}</div>
            </div>
        );
    }

    private renderTooltip() {
        if (this.state.itemProperties) {
            return (
                <div className="scrollable item-properties-table">
                    <FilterTree
                        className="table-tree"
                        nodes={this.state.itemProperties}
                        showCheckboxes={false}
                        showFilter={false}
                        showHeader={true}
                        hideFillers={true}
                        onRowClick={() => {
                            // do nothing
                        }}
                        headers={[
                            { title: 'Key', sortable: true, resizable: true },
                            { title: 'Value', resizable: true }
                        ]}
                    />
                </div>
            );
        }
        return <></>;
    }

    /** Tooltip Signal and Signal Handlers */
    protected _onItemProperties = (data: ItemPropertiesSignalPayload): void =>
        this.doHandleItemPropertiesSignal(data.getProperties());

    private doHandleItemPropertiesSignal(tooltipProps: { [key: string]: string }): void {
        const entries: TreeNode[] = [];
        Object.entries(tooltipProps).forEach(([key, value], index) => {
            const node: TreeNode = {
                id: index,
                parentId: -1,
                labels: [key, value],
                children: [],
                isRoot: true,
                showTooltip: true
            };
            if (key === 'Source') {
                const sourceCodeInfo = value;
                const matches = sourceCodeInfo.match('(.*):(\\d+)');
                let fileLocation: string;
                let line: string;
                if (matches && matches.length === 3) {
                    fileLocation = matches[1];
                    line = matches[2];
                }
                // labels index for which the element needs to be rendered
                node.elementIndex = 1;
                node.getElement = () => this.getSourceCodeElement(key, value, fileLocation, line);
            }
            entries.push(node);
        });
        this.setState({ itemProperties: entries });
    }

    getSourceCodeElement = (key: string, value: string, fileLocation: string, line: string): JSX.Element => (
        <span
            className="source-code-tooltip"
            key={key}
            title={value}
            onClick={this.props.handleSourcecodeLookup}
            data-id={JSON.stringify({ fileLocation, line })}
        >
            {value}
        </span>
    );
}
