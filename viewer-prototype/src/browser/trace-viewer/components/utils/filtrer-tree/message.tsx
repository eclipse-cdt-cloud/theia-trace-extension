import * as React from 'react';

type MessageProps = {
    error: string;
}

export class Message extends React.Component<MessageProps> {
    constructor(props: MessageProps) {
        super(props);
    }

    static defaultProps = {
        error: ''
    }

    render() {
        return <React.Fragment>
            <span>{this.props.error}</span>
        </React.Fragment>
    }
}