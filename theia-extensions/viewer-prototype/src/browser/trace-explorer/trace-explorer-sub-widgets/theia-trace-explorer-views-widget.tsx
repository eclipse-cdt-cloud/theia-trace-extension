import { inject, injectable, postConstruct } from '@theia/core/shared/inversify';
import { ReactWidget, Widget, Message, WidgetManager } from '@theia/core/lib/browser';
import { TspClientProvider } from '../../tsp-client-provider-impl';
import * as React from 'react';
import { ReactAvailableViewsWidget } from 'traceviewer-react-components/lib/trace-explorer/trace-explorer-views-widget';

@injectable()
export class TraceExplorerViewsWidget extends ReactWidget {
    static ID = 'trace-explorer-views-widget';
    static LABEL = 'Available Views';

    @inject(TspClientProvider) protected readonly tspClientProvider!: TspClientProvider;
    @inject(WidgetManager) protected readonly widgetManager!: WidgetManager;

    @postConstruct()
    protected init(): void {
        this.id = TraceExplorerViewsWidget.ID;
        this.title.label = TraceExplorerViewsWidget.LABEL;
        this.update();
    }

    render(): React.ReactNode {
        return (
            <div>
                <ReactAvailableViewsWidget
                    id={this.id}
                    title={this.title.label}
                    tspClientProvider={this.tspClientProvider}
                    // Note: not implemented in the Theia extension yet. By not providing a callback,
                    // the customizability UIs will be disabled (creating and deleting custom analyses) but
                    // if created through the vscode extension they will still be visible and usable.
                    // onCustomizationClick={() =>
                    //     console.warn('Custom Views currently not supported in Theia Trace Extension')
                    // }
                ></ReactAvailableViewsWidget>
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
}
