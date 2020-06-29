import * as React from 'react';
import icons from './icons';

interface CheckboxProps {
    id: number;
    name: string;
    checkedStatus: number;
    onChecked: (id: number) => void;
}

export class CheckboxComponent extends React.Component<CheckboxProps> {
    constructor(props: CheckboxProps) {
        super(props);
    }

    renderCheckbox = (checkedStatus: number) => {
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

    render() {
        return <div onClick={() => this.props.onChecked(this.props.id)} >
            <span style={{padding: 5}}>
                {this.renderCheckbox(this.props.checkedStatus)}
            </span>
            {this.props.name}
        </div>;
    }
}
