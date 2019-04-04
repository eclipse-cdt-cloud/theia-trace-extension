import * as React from 'react';

export interface TestProps {
    name: string;
}

export class TestReactComponent extends React.Component<TestProps> {
    render() {
        return (
            <div>
                {this.props.name}
            </div>
        );
    }
}