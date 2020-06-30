import * as React from 'react';

interface MessageProps {
    error: string;
}

export class Message extends React.Component<MessageProps> {
    constructor(props: MessageProps) {
        super(props);
    }

    static defaultProps = {
        error: ''
    };

    render(): JSX.Element {
        return <React.Fragment>
            <span>{this.props.error}</span>
        </React.Fragment>;
    }
}
