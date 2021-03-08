import { inject, injectable, postConstruct } from 'inversify';
import { ReactWidget, Message } from '@theia/core/lib/browser';
import * as React from 'react';
import { EditorOpenerOptions, EditorManager } from '@theia/editor/lib/browser';
import URI from '@theia/core/lib/common/uri';
import { Signals, signalManager } from '@trace-viewer/base/lib/signals/signal-manager';

@injectable()
export class TraceExplorerTooltipWidget extends ReactWidget {
    static ID = 'trace-explorer-tooltip-widget';
    static LABEL = 'Item Properties';

    @inject(EditorManager) protected readonly editorManager!: EditorManager;

    tooltip?: { [key: string]: string } = undefined;

    private onTooltip = (tooltip?: { [key: string]: string }): void => this.doHandleTooltipSignal(tooltip);

    @postConstruct()
    init(): void {
        this.id = TraceExplorerTooltipWidget.ID;
        this.title.label = TraceExplorerTooltipWidget.LABEL;
        signalManager().on(Signals.TOOLTIP_UPDATED, this.onTooltip);
        this.update();
    }

    dispose(): void {
        super.dispose();
        signalManager().off(Signals.TOOLTIP_UPDATED, this.onTooltip);
    }

    private renderTooltip() {
        const tooltipArray: JSX.Element[] = [];
        if (this.tooltip) {
            Object.entries(this.tooltip).forEach(([key, value]) => {
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
                        onClick={this.handleSourcecodeLookup}
                        data-id={JSON.stringify({ fileLocation, line })}
                    >{key + ': ' + sourceCodeInfo}</p>);
                } else {
                    tooltipArray.push(<p key={key}>{key + ': ' + value}</p>);
                }
            });
        } else {
            tooltipArray.push(<p><i>Select item to view properties</i></p>);
        }

        return (
            <React.Fragment>
                {tooltipArray.map(element => element)}
            </React.Fragment>);
    }

    protected handleSourcecodeLookup = (e: React.MouseEvent<HTMLParagraphElement>): void => this.doHandleSourcecodeLookup(e);

    private doHandleSourcecodeLookup(e: React.MouseEvent<HTMLParagraphElement>) {
        const { fileLocation, line }: { fileLocation: string, line: string } = JSON.parse(`${e.currentTarget.getAttribute('data-id')}`);
        if (fileLocation) {
            const modeOpt: EditorOpenerOptions = {
                mode: 'open'
            };
            let slectionOpt = {
                selection: {
                    start: {
                        line: 0,
                        character: 0
                    },
                    end: {
                        line: 0,
                        character: 0
                    }
                }
            };
            if (line) {
                const lineNumber = parseInt(line);
                slectionOpt = {
                    selection: {
                        start: {
                            line: lineNumber,
                            character: 0
                        },
                        end: {
                            line: lineNumber,
                            character: 0
                        }
                    }
                };
            }
            const opts = {
                ...modeOpt,
                ...slectionOpt
            };
            this.editorManager.open(new URI(fileLocation), opts);
        }
    }

    render(): React.ReactNode {
        return (
            <div className='trace-explorer-tooltip'>
                <div className='trace-explorer-panel-content'>
                    {this.renderTooltip()}
                </div>
            </div>
        );
    }

    private doHandleTooltipSignal(tooltip?: { [key: string]: string }) {
        this.tooltip = tooltip;
        this.update();
    }

    protected onAfterShow(msg: Message): void {
        super.onAfterShow(msg);
        this.update();
    }
}
