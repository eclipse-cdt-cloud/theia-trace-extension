import { inject, injectable, postConstruct } from 'inversify';
import { ReactWidget, Widget, Message, WidgetManager } from '@theia/core/lib/browser';
import * as React from 'react';
import { ReactTimeRangeDataWidget } from 'traceviewer-react-components/lib/trace-explorer//trace-explorer-time-range-data-widget';

@injectable()
export class TraceExplorerTimeRangeDataWidget extends ReactWidget {
    static ID = 'trace-explorer-time-range-data';
    static LABEL = 'Time Range Data';

    @inject(WidgetManager) protected readonly widgetManager!: WidgetManager;

    @postConstruct()
    init(): void {
        this.id = TraceExplorerTimeRangeDataWidget.ID;
        this.title.label = TraceExplorerTimeRangeDataWidget.LABEL;
        this.update();
    }

    render(): React.ReactNode {
        return <div>
            <ReactTimeRangeDataWidget
                id={this.id}
                title={this.title.label}
            />
        </div>;
    }

    protected onResize(msg: Widget.ResizeMessage): void {
        super.onResize(msg);
        this.update();
    }

    protected onAfterShow(msg: Message): void {
        super.onAfterShow(msg);
        this.update();
    }
}
