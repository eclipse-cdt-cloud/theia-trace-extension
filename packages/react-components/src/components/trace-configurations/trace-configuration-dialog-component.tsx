import React from 'react';
import { TraceConfigurationListComponent } from './trace-configuration-list-component';
import { AbstractDialogComponent, DialogComponentProps } from '../abstract-dialog-component';
import { TraceConfigurationsAddDialogComponent } from './trace-configuration-add-component';
import { TraceConfigurationManager } from 'traceviewer-base/lib/trace-configuration-manager';
import { ITspClient } from 'tsp-typescript-client/lib/protocol/tsp-client';
import { ConfigurationSourceType } from 'tsp-typescript-client/lib/models/configuration-source';

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
                <div>
                    <TraceConfigurationListComponent
                        traceConfigurationManager={this.traceConfigurationManager}
                        configurationSourceTypes={this.state.configurationSourceTypes}
                    ></TraceConfigurationListComponent>
                </div>
                <div>
                    <TraceConfigurationsAddDialogComponent
                        key={this.state.configurationSourceTypes.length}
                        traceConfigurationManager={this.traceConfigurationManager}
                        configurationSourceTypes={this.state.configurationSourceTypes}
                    ></TraceConfigurationsAddDialogComponent>
                </div>
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
