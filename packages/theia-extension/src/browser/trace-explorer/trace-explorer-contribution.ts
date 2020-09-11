import { AbstractViewContribution } from '@theia/core/lib/browser/shell/view-contribution';
import { TraceExplorerWidget, TRACE_EXPLORER_ID, TRACE_EXPLORER_LABEL } from './trace-explorer-widget';
import { FrontendApplicationContribution, FrontendApplication } from '@theia/core/lib/browser';

export class TraceExplorerContribution extends AbstractViewContribution<TraceExplorerWidget> implements FrontendApplicationContribution {

    constructor() {
        super({
            widgetId: TRACE_EXPLORER_ID,
            widgetName: TRACE_EXPLORER_LABEL,
            defaultWidgetOptions: {
                area: 'left'
            },
            toggleCommandId: 'trace-explorer:toggle'
        });
    }

    async initializeLayout(_app: FrontendApplication): Promise<void> {
        await this.openView({ activate: false });
    }

}
