import * as React from 'react';
import { Component } from 'react';

interface TooltipProps {
    tooltip: { [key: string]: string };
    position: { x: number, y: number };
}

interface TooltipStates {
    style: { top: string, left: string };

}

export class TooltipComponent extends Component<TooltipProps, TooltipStates> {
    constructor(props: TooltipProps) {
        super(props);
        this.state = { style: { top: props.position.y + 'px', left: props.position.x + 'px' } };
    }

    tooltipRef: React.RefObject<HTMLDivElement> = React.createRef();

    renderTooltip(): React.ReactNode {
        const tooltipArray: React.ReactNode[] = [];
        if (this.props.tooltip) {
            const keys = Object.keys(this.props.tooltip);
            keys.forEach(key => {
                tooltipArray.push(<p key={key}>{key + ': ' + this.props.tooltip[key]}</p>);
            });
        }
        else {
            console.log('Tooltip null');
        }
        return <React.Fragment>
            {tooltipArray.map(element => element)}
        </React.Fragment>;
    }

    render(): React.ReactNode {
        return <div id='tooltip-box' ref={this.tooltipRef} style={this.state.style}>
            {this.renderTooltip()}
        </div>;
    }
}
