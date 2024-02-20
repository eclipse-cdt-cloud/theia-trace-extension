import { faSpinner } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import * as React from 'react';

export interface ReactPlaceholderWidgetProps {
    loading: boolean;
    serverOn: boolean;
    tracesOpen: boolean;
    handleOpenTrace: () => void;
    handleStartServer: () => void;
}

export class ReactExplorerPlaceholderWidget extends React.Component<ReactPlaceholderWidgetProps, {}> {
    constructor(props: ReactPlaceholderWidgetProps) {
        super(props);
    }

    render(): React.ReactNode {
        const { loading, serverOn, handleOpenTrace, handleStartServer } = this.props;
        const onClick = serverOn ? handleOpenTrace : handleStartServer;
        const infoText = serverOn
            ? 'You have not yet opened a trace.'
            : 'No trace server instance is currently running.';
        const buttonText = serverOn ? 'Open Trace' : 'Resume Trace Extension';

        return (
            <div className="placeholder-container" tabIndex={0}>
                <div className="center">{infoText}</div>
                <div className="placeholder-open-workspace-button-container">
                    <button
                        className="plcaeholder-open-workspace-button"
                        title={buttonText}
                        onClick={onClick}
                        disabled={loading}
                    >
                        {loading && <FontAwesomeIcon icon={faSpinner} spin style={{ marginRight: '5px' }} />}
                        {loading && <span>Connecting to trace server</span>}
                        {!loading && <span>{buttonText}</span>}
                    </button>
                </div>
            </div>
        );
    }
}
