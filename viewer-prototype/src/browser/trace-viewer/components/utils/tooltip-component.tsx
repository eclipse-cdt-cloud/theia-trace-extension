import * as React from 'react';

type TooltipProps = {
    tooltip: { [key: string]: string };
}

export class TooltipComponent extends React.Component<TooltipProps> {
    constructor(props: TooltipProps) {
        super(props); 
    }

    tooltipRef = React.createRef<any>();


    renderTooltip() {
        const tooltipArray: any[] = [];
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
            {tooltipArray.map(element => {
                return element;
            })}
        </React.Fragment>
    }

    render() {
        return <div id='tooltip-box' ref={this.tooltipRef}>
            {this.renderTooltip()}
        </div>
    }
}