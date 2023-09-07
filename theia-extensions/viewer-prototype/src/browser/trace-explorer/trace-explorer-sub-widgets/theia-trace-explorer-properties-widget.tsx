import { inject, injectable, postConstruct } from '@theia/core/shared/inversify';
import { Message, ReactWidget, Widget } from '@theia/core/lib/browser';
import * as React from 'react';
import { EditorOpenerOptions, EditorManager } from '@theia/editor/lib/browser';
import URI from '@theia/core/lib/common/uri';
import { ReactItemPropertiesWidget } from 'traceviewer-react-components/lib/trace-explorer/trace-explorer-properties-widget';

@injectable()
export class TraceExplorerItemPropertiesWidget extends ReactWidget {
    static ID = 'trace-explorer-item-properties-widget';
    static LABEL = 'Item Properties';

    @inject(EditorManager) protected readonly editorManager!: EditorManager;

    @postConstruct()
    protected init(): void {
        this.id = TraceExplorerItemPropertiesWidget.ID;
        this.title.label = TraceExplorerItemPropertiesWidget.LABEL;
        this.update();
    }

    dispose(): void {
        super.dispose();
    }

    render(): React.ReactNode {
        return (
            <div>
                <ReactItemPropertiesWidget
                    id={this.id}
                    title={this.title.label}
                    handleSourcecodeLookup={this.handleSourcecodeLookup}
                ></ReactItemPropertiesWidget>
            </div>
        );
    }

    protected onResize(msg: Widget.ResizeMessage): void {
        super.onResize(msg);
        this.update();
    }

    protected onAfterShow(msg: Message): void {
        super.onAfterShow(msg);
        this.update();
    }

    protected handleSourcecodeLookup = (e: React.MouseEvent<HTMLParagraphElement>): void =>
        this.doHandleSourcecodeLookup(e);

    private doHandleSourcecodeLookup(e: React.MouseEvent<HTMLParagraphElement>) {
        const { fileLocation, line }: { fileLocation: string; line: string } = JSON.parse(
            `${e.currentTarget.getAttribute('data-id')}`
        );
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
}
