import * as React from 'react';
import icons from './icons';

interface CheckboxProps {
    id: number;
    name: string;
    checkedStatus: number;
    onToggleCheck: (id: number) => void;
}

export class CheckboxComponent extends React.Component<CheckboxProps> {
    constructor(props: CheckboxProps) {
        super(props);
    }

    private handleClick = (): void => {
        this.props.onToggleCheck(this.props.id);
    };

    renderCheckbox = (checkedStatus: number): React.ReactNode => {
        switch (checkedStatus) {
            case 0:
                return icons.unchecked;
            case 1:
                return icons.checked;
            case 2:
                return icons.halfChecked;
            default:
                return icons.unchecked;
        }
    };

    render(): JSX.Element {
        return <div onClick={this.handleClick} >
            <span style={{padding: 5}}>
                {this.renderCheckbox(this.props.checkedStatus)}
            </span>
            {this.props.name}
        </div>;
    }
}
