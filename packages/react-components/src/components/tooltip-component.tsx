import * as React from 'react';
import ReactTooltip from 'react-tooltip';

type MaybePromise<T> = T | Promise<T>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface TooltipComponentState<T = any> {
    element?: T;
    func?: ((element: T) => MaybePromise<{ [key: string]: string } | undefined>);
    content?: string;
}

export class TooltipComponent extends React.Component<unknown, TooltipComponentState> {

    private static readonly HOURGLASS_NOT_DONE = '&#x23f3;';

    timerId?: NodeJS.Timeout;

    constructor(props: unknown) {
        super(props);
        this.state = {
            element: undefined,
            func: undefined,
            content: undefined
        };
    }

    render(): React.ReactNode {
        return <div role={ 'tooltip-component-role' }
            onMouseEnter={() => {
                if (this.timerId) {
                    clearTimeout(this.timerId);
                    this.timerId = undefined;
                }
            }}
            onMouseLeave={() => {
                ReactTooltip.hide();
                this.setState({ content: undefined });
            }}
            >
            <ReactTooltip
                className="react-tooltip"
                id="tooltip-component"
                effect='float'
                type='info'
                place='bottom'
                html={true}
                delayShow={500}
                delayUpdate={500}
                afterShow={() => {
                    if (this.timerId) {
                        clearTimeout(this.timerId);
                        this.timerId = undefined;
                    }
                    if (this.state.content === undefined) {
                        this.fetchContent(this.state.element);
                    }
                }}
                clickable={true}
                scrollHide={true}
                arrowColor='transparent'
                overridePosition={({ left, top }, currentEvent, currentTarget, refNode, place) => {
                    left += (place === 'left') ? -10 : (place === 'right') ? 10 : 0;
                    top += (place === 'top') ? -10 : 0;
                    return { left, top };
                }}
                getContent={() => this.getContent()}
            />
        </div>;
    }

    setElement<T>(element: T, func?: ((element: T) => MaybePromise<{ [key: string]: string } | undefined>)): void {
        if (element !== this.state.element && this.state.element) {
            if (this.state.content) {
                if (this.timerId === undefined) {
                    // allow 500 ms to move mouse over the tooltip
                    this.timerId = setTimeout(() => {
                        if (this.state.element !== element || this.state.element === undefined) {
                            ReactTooltip.hide();
                            this.setState({ content: undefined });
                        }
                    }, 500);
                }
            } else {
                // content being fetched, hide the hourglass tooltip
                ReactTooltip.hide();
            }
        }
        this.setState({ element, func });
    }

    private getContent() {
        if (this.state.content) {
            return this.state.content;
        }
        if (this.state.element) {
            return TooltipComponent.HOURGLASS_NOT_DONE;
        }
        return undefined;
    }

    private async fetchContent(element: unknown) {
        if (this.state.element && this.state.func) {
            const tooltipInfo = await this.state.func(element);
            let content = '<table>';
            if (tooltipInfo) {
                Object.entries(tooltipInfo).forEach(([k, v]) => content += this.tooltipRow(k, v));
            }
            content += '</table>';
            if (this.state.element === element) {
                this.setState({ content });
            }
        }
    }

    private tooltipRow(key: string, value: string) {
        return '<tr><td style="text-align:left">' + key + '</td><td style="text-align:left">' + value + '</td></tr>';
    }
}
