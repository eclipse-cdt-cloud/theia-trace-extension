import * as React from 'react';

type CheckboxProps = {
    id: number
    name: string
    checked: boolean;
    onChecked: (id: number) => void
}

type CheckboxState = {
    checked: boolean;
}

export class CheckboxComponent extends React.Component<CheckboxProps, CheckboxState> {
    constructor(props: CheckboxProps) {
        super(props);
        this.state = {
            checked: this.props.checked
        }
    }

    render() {
        this.handleChange = this.handleChange.bind(this);
        return <div>
            <input type={'checkbox'} checked={this.state.checked} onChange={this.handleChange} />
            {this.props.name}
        </div>;
    }

    private handleChange() {
        this.setState((prevState) => ({
            checked: prevState.checked ? false : true
        }));

        this.props.onChecked(this.props.id);
    }
}