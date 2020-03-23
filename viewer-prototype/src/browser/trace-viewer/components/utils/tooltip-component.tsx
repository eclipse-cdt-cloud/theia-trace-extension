import * as React from 'react';

interface TooltipProps {
    tooltip: { [key: string]: string };
}

export class TooltipComponent extends React.Component<TooltipProps> {
    constructor(props: TooltipProps) {
        super(props);
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
        return <div id='tooltip-box' ref={this.tooltipRef}>
            {this.renderTooltip()}
        </div>;
    }
}
