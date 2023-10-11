import React from 'react';
import { ConfigurationSourceType } from 'tsp-typescript-client/lib/models/configuration-source';
import { AutoSizer, List, ListRowProps } from 'react-virtualized';
import { TraceConfigurationManager } from './trace-configuration-manager';

export interface TraceConfigurationListComponentProps {
    traceConfigurationManager: TraceConfigurationManager;
    configurationSourceTypes: ConfigurationSourceType[];
}

export class TraceConfigurationListComponent extends React.Component<TraceConfigurationListComponentProps> {
    private _forceUpdateKey = false;
    private readonly TRACE_CONFIGURATIONS_ROW_HEIGHT = 20;

    constructor(props: TraceConfigurationListComponentProps) {
        super(props);
    }

    render(): React.ReactElement {
        this._forceUpdateKey = !this._forceUpdateKey;
        const key = Number(this._forceUpdateKey);
        let outputsRowCount = 0;
        const outputs = this.props.configurationSourceTypes;
        if (outputs) {
            outputsRowCount = outputs.length;
        }
        const totalHeight = 400; // TODO: Change this value once styling is applied
        return (
            <div>
                List of configurations
                <AutoSizer>
                    {({ width }) => (
                        <List
                            key={key}
                            height={totalHeight}
                            width={width}
                            rowCount={outputsRowCount}
                            rowHeight={this.TRACE_CONFIGURATIONS_ROW_HEIGHT}
                            rowRenderer={this.renderRowOutputs}
                        />
                    )}
                </AutoSizer>
            </div>
        );
    }

    protected renderRowOutputs = (props: ListRowProps): React.ReactNode => this.doRenderRowOutputs(props);

    private doRenderRowOutputs(props: ListRowProps): React.ReactNode {
        let outputName = '';
        let output: ConfigurationSourceType | undefined;
        const configurationSourceTypes = this.props.configurationSourceTypes;
        if (
            configurationSourceTypes &&
            configurationSourceTypes.length &&
            props.index < configurationSourceTypes.length
        ) {
            output = configurationSourceTypes[props.index];
            outputName = output.name;
        }

        return (
            <div>
                <div style={{ width: '100%' }}>
                    <h4 className="outputs-element-name">{outputName}</h4>
                </div>
            </div>
        );
    }
}
