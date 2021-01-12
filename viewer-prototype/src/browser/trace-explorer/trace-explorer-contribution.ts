import { injectable } from 'inversify';
import { AbstractViewContribution } from '@theia/core/lib/browser/shell/view-contribution';
import { TraceExplorerWidget, } from './trace-explorer-widget';
import { FrontendApplicationContribution, FrontendApplication } from '@theia/core/lib/browser';

@injectable()
export class TraceExplorerContribution extends AbstractViewContribution<TraceExplorerWidget> implements FrontendApplicationContribution {
    constructor() {
        super({
            widgetId: TraceExplorerWidget.ID,
            widgetName: TraceExplorerWidget.LABEL,
            defaultWidgetOptions: {
                area: 'left'
            },
            toggleCommandId: 'trace-explorer:toggle'
        });
    }

    initializeLayout(_app: FrontendApplication): void {
        this.openView({ activate: false });
    }

}
