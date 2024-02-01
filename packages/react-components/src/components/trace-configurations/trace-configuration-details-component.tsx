import React from 'react';
import { TraceConfigurationManager } from 'traceviewer-base/src/trace-configuration-manager';
import { Configuration } from 'tsp-typescript-client/lib/models/configuration';
import { ConfigurationSourceType } from 'tsp-typescript-client/lib/models/configuration-source';

export interface TraceConfigurationsDetailsComponentProps {
    configuration: Configuration,
    configurationSourceType: ConfigurationSourceType,
    traceConfigurationManager: TraceConfigurationManager
}

export class TraceConfigurationsDetailsComponent extends React.Component<
TraceConfigurationsDetailsComponentProps
> {
    constructor(props: TraceConfigurationsDetailsComponentProps) {
        super(props);
    }

    render(): React.ReactNode {
        return <React.Fragment>
            <div>Config Details</div>
            <div>
                <label>Name</label>
                <span>{this.props.configuration.name}</span>
            </div>
            <div>
                <label>Description</label>
                <span>{this.props.configuration.description}</span>
            </div>
            <div>
                <label>Source type</label>
                <span>{this.props.configurationSourceType.name}</span>
            </div>
        </React.Fragment>;
    }

    renderParameters(): React.ReactNode {
        return <React.Fragment>
            {
                this.props.configuration.parameters &&
                this.props.configuration.parameters.forEach((value: string, key: string) => {
                    <div>
                        <label>{key}</label>
                        <span>{value}</span>
                    </div>;
                })
            }
        </React.Fragment>;
    }
}
