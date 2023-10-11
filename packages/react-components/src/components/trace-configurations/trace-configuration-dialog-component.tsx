import React from 'react';
import { ConfigurationSourceType } from 'tsp-typescript-client/lib/models/configuration-source';
import { ITspClient } from 'tsp-typescript-client';
import { TraceConfigurationListComponent } from './trace-configuration-list-component';
import { TraceConfigurationManager } from './trace-configuration-manager';
import { AbstractDialogComponent, DialogComponentProps } from '../abstract-dialog-component';

export interface TraceConfigurationVisibility {
    list: boolean;
    add: boolean;
}

export interface TraceConfigurationsDialogComponentProps extends DialogComponentProps {
    tspClient: ITspClient;
}
export interface TraceConfigurationsDialogComponentState {
    visibility: TraceConfigurationVisibility;
    configurationSourceTypes: ConfigurationSourceType[];
}

export class TraceConfigurationsDialogComponent extends AbstractDialogComponent<
    TraceConfigurationsDialogComponentProps,
    TraceConfigurationsDialogComponentState
> {
    protected renderDialogBody(): React.ReactElement {
        return (
            <React.Fragment>
                <TraceConfigurationListComponent
                    traceConfigurationManager={this.traceConfigurationManager}
                    configurationSourceTypes={this.state.configurationSourceTypes}
                ></TraceConfigurationListComponent>
            </React.Fragment>
        );
    }
    protected renderFooter(): React.ReactElement {
        return <React.Fragment></React.Fragment>;
    }
    private traceConfigurationManager: TraceConfigurationManager;

    constructor(props: TraceConfigurationsDialogComponentProps) {
        super(props);
        this.traceConfigurationManager = new TraceConfigurationManager(this.props.tspClient);
        this.state = {
            visibility: {
                list: false,
                add: false
            },
            configurationSourceTypes: []
        };
    }

    protected onAfterOpen(): void {
        this.traceConfigurationManager.getConfigurationSourceTypes().then(result => {
            if (result !== undefined) {
                this.setState({
                    configurationSourceTypes: result
                });
            }
        });
    }

    private updateVisibility(visibility: TraceConfigurationVisibility): void {
        this.setState({
            visibility: visibility
        });
    }
}
