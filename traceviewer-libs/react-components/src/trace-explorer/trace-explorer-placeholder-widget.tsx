import { faSpinner } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import * as React from 'react';

export enum TraceResourceType {
    FOLDER = 'Folder',
    FILE = 'File'
}

export interface ReactPlaceholderWidgetProps {
    loading: boolean;
    handleOpenTrace: (type?: TraceResourceType) => void;
    renderOnly?: TraceResourceType;
}

export class ReactExplorerPlaceholderWidget extends React.Component<ReactPlaceholderWidgetProps, unknown> {
    constructor(props: ReactPlaceholderWidgetProps) {
        super(props);
    }

    render(): React.ReactNode {
        return (
            <div className="placeholder-container" tabIndex={0}>
                <div className="center">{'You have not yet opened a trace.'}</div>
                {this.renderButton(TraceResourceType.FOLDER, 'Open Trace Folder')}
                {this.renderButton(TraceResourceType.FILE, 'Open Trace File')}
            </div>
        );
    }

    renderButton(type: TraceResourceType, title: string): React.ReactNode {
        const btnTitle =
            type === TraceResourceType.FILE ? 'Select a single trace file to open' : 'Select a trace folder to open';
        return this.props.renderOnly === undefined || this.props.renderOnly === type ? (
            <div className="placeholder-open-workspace-button-container">
                <button
                    className="plcaeholder-open-workspace-button"
                    title={btnTitle}
                    onClick={() => this.props.handleOpenTrace(type)}
                    disabled={this.props.loading}
                >
                    {this.props.loading && <FontAwesomeIcon icon={faSpinner} spin style={{ marginRight: '5px' }} />}
                    {this.props.loading && <span>Connecting to trace server</span>}
                    {!this.props.loading && <span>{title}</span>}
                </button>
            </div>
        ) : undefined;
    }
}
