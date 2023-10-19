
import React from 'react';
import { TraceConfigurationManager } from 'traceviewer-base/lib/trace-configuration-manager';
import { ConfigurationSourceType } from 'tsp-typescript-client/lib/models/configuration-source';
import { Query } from 'tsp-typescript-client/lib/models/query/query';

interface ConfigurationParameters {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any
}

export interface TraceConfigurationsAddComponentProps {
    configurationSourceTypes: ConfigurationSourceType[],
    traceConfigurationManager: TraceConfigurationManager
}

export interface TraceConfigurationsAddComponentState {
    selectedConfigType: ConfigurationSourceType | undefined;
}

export class TraceConfigurationsAddDialogComponent extends React.Component<TraceConfigurationsAddComponentProps, TraceConfigurationsAddComponentState>{
    private sourceTypeSelectRef: React.RefObject<HTMLSelectElement>;
    private readonly traceConfigParamPrefix = 'trace-configuration-param-';

    constructor(props: TraceConfigurationsAddComponentProps) {
        super(props);
        this.sourceTypeSelectRef = React.createRef();
        this.state = {
            selectedConfigType: undefined
        };
    }

    render(): React.ReactElement {
        return <React.Fragment>
            <label>Configuration source type: </label>
            <select ref={this.sourceTypeSelectRef} onChange={() => this.onChangeConfigurationSourceType()}>
            {
                this.props.configurationSourceTypes.map((configType: ConfigurationSourceType) => (
                    <option key={configType.name}>{configType.name}</option>
                ))
            }
            <option disabled selected> -- select an option -- </option>
            </select>
            {
                this.state.selectedConfigType !== undefined &&
                <div>
                    {this.renderParameters(this.state.selectedConfigType)}
                </div>
            }
            <div>
                <button onClick={() => this.createConfiguration()}>OK</button>
            </div>
        </React.Fragment>;
    }

    private renderParameters(configType: ConfigurationSourceType): React.ReactElement {
        const parameters = configType.parameterDescriptors;
        if (parameters) {
            return  <React.Fragment>
                <div>Parameters</div>
                {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    parameters.map((param: any) => {
                        const paramHtmlId = this.traceConfigParamPrefix + param.keyName;
                        return (<div key={param.keyName}>
                            <div>
                                <label>{param.keyName}</label>
                                <input type='text' id={paramHtmlId}></input>
                            </div>
                        </div>);
                    })
                }
            </React.Fragment>;
        }
        return <React.Fragment></React.Fragment>;
    }

    private onChangeConfigurationSourceType(): void {
        const selectedIndex = this.sourceTypeSelectRef.current?.selectedIndex;
        if (selectedIndex !== undefined) {
            const selectedConfigurationType = this.props.configurationSourceTypes[selectedIndex];
            this.setState({
                selectedConfigType: selectedConfigurationType
            });
        }
    }

    private async createConfiguration(): Promise<void> {
        const selectedIndex = this.sourceTypeSelectRef?.current?.selectedIndex;
        if ((selectedIndex !== undefined) && (selectedIndex < this.props.configurationSourceTypes.length)) {

            const selectedSourceType = this.props.configurationSourceTypes[selectedIndex];
            const sourceTypeId = selectedSourceType.id;
            const parameters: ConfigurationParameters = {};
            selectedSourceType.parameterDescriptors.forEach(param => {
                const htmlId = this.traceConfigParamPrefix + param.keyName;
                const inputElement = document.getElementById(htmlId);
                if (inputElement instanceof HTMLInputElement) {
                    parameters[param.keyName] = inputElement.value;
                }
            });

            await this.props.traceConfigurationManager.createConfiguration(sourceTypeId, new Query(parameters));
        }
    }
}
