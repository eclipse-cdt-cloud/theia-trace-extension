import { inject, injectable, postConstruct } from 'inversify';
import { ReactWidget, Widget, Message, WidgetManager } from '@theia/core/lib/browser';
import { TspClientProvider } from '../../tsp-client-provider-impl';
import * as React from 'react';
import { ReactAvailableViewsWidget} from 'traceviewer-react-components/lib/trace-explorer/trace-explorer-views-widget';
import { TraceViewerWidget } from '../../trace-viewer/trace-viewer';

@injectable()
export class TraceExplorerViewsWidget extends ReactWidget {
    static ID = 'trace-explorer-views-widget';
    static LABEL = 'Available Views';

    @inject(TspClientProvider) protected readonly tspClientProvider!: TspClientProvider;
    @inject(WidgetManager) protected readonly widgetManager!: WidgetManager;

    @postConstruct()
    init(): void {
        this.id = TraceExplorerViewsWidget.ID;
        this.title.label = TraceExplorerViewsWidget.LABEL;
        this.update();
    }

    dispose(): void {
        super.dispose();
    }

    render(): React.ReactNode {
        return (<div>
            { <ReactAvailableViewsWidget
                id={this.id}
                title={this.title.label}
                tspClientProvider={this.tspClientProvider}
                widgetManager={this.widgetManager}
                traceViewerWidgetID={TraceViewerWidget.ID}
            ></ReactAvailableViewsWidget>
            }
        </div>);
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
