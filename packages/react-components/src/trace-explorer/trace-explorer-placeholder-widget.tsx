import { faSpinner } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import * as React from 'react';

export interface ReactPlaceholderWidgetProps {
    loading: boolean;
    handleOpenTrace: () => void;
}

export class ReactExplorerPlaceholderWidget extends React.Component<ReactPlaceholderWidgetProps, unknown> {
    constructor(props: ReactPlaceholderWidgetProps) {
        super(props);
    }

    render(): React.ReactNode {
        return (
            <div className="placeholder-container" tabIndex={0}>
                <div className="center">{'You have not yet opened a trace.'}</div>
                <div className="placeholder-open-workspace-button-container">
                    <button
                        className="plcaeholder-open-workspace-button"
                        title="Select a trace to open"
                        onClick={this.props.handleOpenTrace}
                        disabled={this.props.loading}
                    >
                        {this.props.loading && <FontAwesomeIcon icon={faSpinner} spin style={{ marginRight: '5px' }} />}
                        {this.props.loading && <span>Connecting to trace server</span>}
                        {!this.props.loading && <span>Open Trace</span>}
                    </button>
                </div>
            </div>
        );
    }
}
