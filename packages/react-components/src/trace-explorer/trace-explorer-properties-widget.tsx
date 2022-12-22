import * as React from 'react';
import { signalManager, Signals } from 'traceviewer-base/lib/signals/signal-manager';

export interface ReactPropertiesWidgetProps {
    id: string,
    title: string,
    handleSourcecodeLookup: (e: React.MouseEvent<HTMLParagraphElement>) => void;
}

export interface ReactPropertiesWidgetState {
    itemProperties: { [key: string]: string };
}

export class ReactItemPropertiesWidget extends React.Component<ReactPropertiesWidgetProps, ReactPropertiesWidgetState> {

    constructor(props: ReactPropertiesWidgetProps) {
        super(props);
        this.state = {
            itemProperties: {}
        };
        signalManager().on(Signals.ITEM_PROPERTIES_UPDATED, this._onItemProperties);
    }

    componentWillUnmount(): void {
        signalManager().off(Signals.ITEM_PROPERTIES_UPDATED, this._onItemProperties);
    }

    render(): React.ReactNode {
        return (
            <div className='trace-explorer-item-properties'>
                <div className='trace-explorer-panel-content'>
                    {this.renderTooltip()}
                </div>
            </div>
        );
    }

    private renderTooltip() {
        const tooltipArray: JSX.Element[] = [];
        if (this.state.itemProperties) {
            Object.entries(this.state.itemProperties).forEach(([key, value]) => {
                if (key === 'Source') {
                    const sourceCodeInfo = value;
                    const matches = sourceCodeInfo.match('(.*):(\\d+)');
                    let fileLocation;
                    let line;
                    if (matches && matches.length === 3) {
                        fileLocation = matches[1];
                        line = matches[2];
                    }
                    tooltipArray.push(<p className='source-code-tooltip'
                        key={key}
                        onClick={this.props.handleSourcecodeLookup}
                        data-id={JSON.stringify({ fileLocation, line })}
                    >{key + ': ' + sourceCodeInfo}</p>);
                } else {
                    tooltipArray.push(<p key={key}>{key + ': ' + value}</p>);
                }
            });
        } else {
            tooltipArray.push(<p key="-1"><i>Select item to view properties</i></p>);
        }

        return (
            <React.Fragment>
                {tooltipArray.map(element => element)}
            </React.Fragment>);
    }

    /** Tooltip Signal and Signal Handlers */
    protected _onItemProperties = (tooltip: { [key: string]: string }): void => this.doHandleItemPropertiesSignal(tooltip);

    private doHandleItemPropertiesSignal(tooltipProps: { [key: string]: string }): void {
        this.setState({itemProperties: tooltipProps});
    }
}

