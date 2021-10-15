import * as React from 'react';

type MaybePromise<T> = T | Promise<T>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface TooltipXYComponentState<T = any> {
    tooltipData?: TooltipData,
    onDisplay: boolean,
    inTooltip: boolean
}

interface TooltipData {
    title?: string,
    dataPoints?: [];
    top?: number,
    bottom?: number,
    right?: number,
    left?: number,
    opacity?: number,
    transition?: string,
    zeros?: number
}

export class TooltipXYComponent extends React.Component<unknown, TooltipXYComponentState> {
    private divRef: React.RefObject<HTMLInputElement>;
    private readonly horizontalSpace: number = 35; // space to add between mouse cursor and tooltip

    timerId?: NodeJS.Timeout;

    constructor(props: unknown) {
        super(props);
        this.state = {
            tooltipData: undefined,
            onDisplay: false,
            inTooltip: false,
        };
        this.divRef = React.createRef();
    }

    render(): React.ReactNode {
        const leftPos = this.state.tooltipData?.left ? this.state.tooltipData.left + this.horizontalSpace : undefined;
        const rightPos = this.state.tooltipData?.right ? this.state.tooltipData.right + this.horizontalSpace : undefined;
        let zeros = 0;
        let allZeros = false;
        if (this.state.tooltipData?.zeros && this.state.tooltipData.zeros > 0) {
            zeros = this.state.tooltipData?.zeros;
        }
        if (this.state.tooltipData?.dataPoints?.length === 0) {
            allZeros = true;
        }

        return (
            <div
                ref={this.divRef}
                onMouseEnter={() => {
                    this.setState({ inTooltip: true });
                    if (this.timerId) {
                        clearTimeout(this.timerId);
                        this.timerId = undefined;
                    }
                }}
                onMouseLeave={() => {
                    this.setState({ tooltipData: { opacity: 0, transition: '0s' }, inTooltip: false });
                }}
                style={{
                    padding: 10,
                    position: 'absolute',
                    textAlign: 'left',
                    maxHeight: '250px',
                    maxWidth: '400px',
                    whiteSpace: 'nowrap',
                    overflow: 'auto',
                    color: 'white',
                    border: '1px solid transparent',
                    backgroundColor: 'rgba(51, 122, 183, 0.9)',
                    borderRadius: 3,
                    top: this.state.tooltipData?.top,
                    bottom: this.state.tooltipData?.bottom,
                    right: rightPos,
                    left: leftPos,
                    opacity: this.state.tooltipData?.opacity ? this.state.tooltipData.opacity : 0,
                    transition: this.state.tooltipData?.transition ? 'opacity ' + this.state.tooltipData.transition : 'opacity 0.3s',
                    zIndex: 999
                }}
            >
                <p style={{margin: '0 0 5px 0'}}>{this.state.tooltipData?.title}</p>
                <ul style={{padding: '0'}}>
                    {this.state.tooltipData?.dataPoints?.map((point: { color: string, background: string, label: string, value: string }, i: number) =>
                        <li key={i} style={{listStyle: 'none', display: 'flex', marginBottom: 5}}>
                            <div style={{
                                height: '10px',
                                width: '10px',
                                margin: 'auto 0',
                                border: 'solid thin',
                                borderColor: point.color,
                                backgroundColor: point.background
                                }}
                            ></div>
                            <span style={{marginLeft: '5px'}}>{point.label} {point.value}</span>
                        </li>
                    )}
                </ul>
                {allZeros ?
                    <p style={{marginBottom: 0}}>All values: 0</p>
                    :
                    zeros > 0 &&
                    <p style={{marginBottom: 0}}>{this.state.tooltipData?.zeros} other{zeros > 1 ? 's' : ''}: 0</p>
                }
            </div>
        );
    }

    setElement<TooltipData>(tooltipData: TooltipData): void {
        if (this.timerId) {
            clearTimeout(this.timerId);
        }
        this.timerId = setTimeout(() => {
            this.setState({ tooltipData, onDisplay: true });
        }, 500);

        if (this.state.onDisplay) {
            this.setState({ onDisplay: false });
            setTimeout(() => {
                if (!this.state.inTooltip) {
                    this.setState({tooltipData: { opacity: 0, transition: '0s' }, inTooltip: false });
                }
            }, 500);
        }
    }
}
