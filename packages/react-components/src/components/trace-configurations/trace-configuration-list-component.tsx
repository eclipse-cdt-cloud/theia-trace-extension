import React from 'react';
import { AutoSizer, List, ListRowProps } from 'react-virtualized';
import { TraceConfigurationManager } from 'traceviewer-base/lib/trace-configuration-manager';
import { Configuration } from 'tsp-typescript-client/lib/models/configuration';
import { ConfigurationSourceType } from 'tsp-typescript-client/lib/models/configuration-source';
import { TraceConfigurationsDetailsComponent } from './trace-configuration-details-component';

export interface TraceConfigurationListComponentProps {
    traceConfigurationManager: TraceConfigurationManager;
    configurationSourceTypes: ConfigurationSourceType[];
}

export interface TraceConfigurationListComponentState {
    configurations: Configuration[],
    selectedConfiguration: Configuration | undefined,
    selectedConfigurationSourceType: ConfigurationSourceType | undefined
}

export class TraceConfigurationListComponent extends React.Component<TraceConfigurationListComponentProps, TraceConfigurationListComponentState> {
    private _forceUpdateKey = false;
    private readonly TRACE_CONFIGURATIONS_ROW_HEIGHT = 20;
    private sourceTypeSelectRef: React.RefObject<HTMLSelectElement>;

    constructor(props: TraceConfigurationListComponentProps) {
        super(props);

        this.sourceTypeSelectRef = React.createRef();
        this.state = {
            configurations: [],
            selectedConfiguration: undefined,
            selectedConfigurationSourceType: undefined
        };
    }

    render(): React.ReactElement {
        this._forceUpdateKey = !this._forceUpdateKey;
        const key = Number(this._forceUpdateKey);
        let outputsRowCount = 0;
        const outputs = this.state.configurations;
        if (outputs) {
            outputsRowCount = outputs.length;
        }
        const totalHeight = this.TRACE_CONFIGURATIONS_ROW_HEIGHT * outputsRowCount;
        return (
            <React.Fragment>
                <div>
                    {
                        this.state.selectedConfiguration && this.state.selectedConfigurationSourceType &&
                        <div>
                            <TraceConfigurationsDetailsComponent
                                    key={this.state.selectedConfiguration.id}
                                    configuration={this.state.selectedConfiguration}
                                    traceConfigurationManager={this.props.traceConfigurationManager}
                                    configurationSourceType={this.state.selectedConfigurationSourceType}></TraceConfigurationsDetailsComponent>
                        </div>
                    }
                    <div>
                        <label>Configuration source type: </label>
                        <select ref={this.sourceTypeSelectRef} onChange={() => this.onChangeConfigurationSource()}>
                        {
                            this.props.configurationSourceTypes.map((configType: ConfigurationSourceType) => (
                                <option key={configType.name}>{configType.name}</option>
                            ))
                        }
                        <option disabled selected> -- select an option -- </option>
                        </select>
                    </div>
                    {/* <AutoSizer>
                        {({ width }) => (
                            <List
                                key={key}
                                height={totalHeight}
                                width={width}
                                rowCount={outputsRowCount}
                                rowHeight={totalHeight}
                                rowRenderer={this.renderRowOutputs}
                            />
                        )}
                    </AutoSizer> */}

                    <div>List of configurations</div>
                    {
                        this.state.configurations &&
                        <div style={{height: totalHeight}}>
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
                    }
                </div>
            </React.Fragment>
        );
    }

    protected renderRowOutputs = (props: ListRowProps): React.ReactNode => this.doRenderRowOutputs(props);

    private doRenderRowOutputs(props: ListRowProps): React.ReactNode {
        let outputName = '';
        let outputId = '';
        let output: Configuration | undefined;
        const configurations = this.state.configurations;
        if (
            configurations &&
            configurations.length &&
            props.index < configurations.length
        ) {
            output = configurations[props.index];
            outputName = output.name;
            outputId = output.id;
        }

        return (
            <div key={outputId} onClick={() => this.onConfigurationSelected(output)}>
                <div style={{ width: '100%', display: 'flex'}}>
                    <h4 className="outputs-element-name">{outputName}</h4>
                    <button onClick={(event: React.MouseEvent<HTMLButtonElement>) => this.onConfigurationDeleted(event, output)}>Delete</button>
                </div>
            </div>
        );
    }

    private async fetchConfigurations() {
        const selectedIndex = this.sourceTypeSelectRef.current?.selectedIndex;
        if (selectedIndex !== undefined && selectedIndex < this.props.configurationSourceTypes.length) {
            const selectedSourceType = this.props.configurationSourceTypes[selectedIndex];

            const configurations = await this.props.traceConfigurationManager.fetchConfigurations(selectedSourceType.id);
            if (configurations) {
                this.setState({
                    configurations: configurations,
                    selectedConfigurationSourceType: selectedSourceType
                });
            }
        }
    }

    private async onChangeConfigurationSource(): Promise<void> {
        this.fetchConfigurations();
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private async onConfigurationSelected(selectedConfiguration: Configuration | undefined): Promise<void> {
        if (selectedConfiguration) {
            this.setState({
                selectedConfiguration: selectedConfiguration
            });
        }
    }

    private async onConfigurationDeleted(event: React.MouseEvent<HTMLButtonElement>, configuration: Configuration | undefined) {
        event.stopPropagation();
        if (configuration !== undefined) {
            const result = await this.props.traceConfigurationManager.deleteConfiguration(configuration.sourceTypeId, configuration.id);
            if (result !== undefined) {
                this.fetchConfigurations();
            }
        }
    }
}
