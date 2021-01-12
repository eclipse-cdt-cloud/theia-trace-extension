import { inject, injectable, postConstruct } from 'inversify';
import { ReactWidget, Message } from '@theia/core/lib/browser';
import * as React from 'react';
import { EditorOpenerOptions, EditorManager } from '@theia/editor/lib/browser';
import URI from '@theia/core/lib/common/uri';
import { Signals, signalManager } from '@trace-viewer/base/lib/signal-manager';

@injectable()
export class TraceExplorerTooltipWidget extends ReactWidget {
    static ID = 'trace-explorer-tooltip-widget';
    static LABEL = 'Time Graph Tooltip';

    @inject(EditorManager) protected readonly editorManager!: EditorManager;

    tooltip: { [key: string]: string } = {};

    @postConstruct()
    init(): void {
        this.id = TraceExplorerTooltipWidget.ID;
        this.title.label = TraceExplorerTooltipWidget.LABEL;
        signalManager().on(Signals.TOOLTIP_UPDATED, ({ tooltip }) => this.onTooltip(tooltip));
        this.update();
    }

    dispose(): void {
        super.dispose();
        signalManager().off(Signals.TOOLTIP_UPDATED, ({ tooltip }) => this.onTooltip(tooltip));
    }

    private renderTooltip() {
        const tooltipArray: JSX.Element[] = [];
        if (this.tooltip) {
            const keys = Object.keys(this.tooltip);
            keys.forEach(key => {
                if (key === 'Source') {
                    const sourceCodeInfo = this.tooltip[key];
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
                    tooltipArray.push(<p key={key}>{key + ': ' + this.tooltip[key]}</p>);
                }
            });
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

    private onTooltip(tooltip: { [key: string]: string }) {
        this.tooltip = tooltip;
        this.update();
    }

    protected onAfterShow(msg: Message): void {
        super.onAfterShow(msg);
        this.update();
    }
}
