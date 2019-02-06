import { AbstractViewContribution } from "@theia/core/lib/browser/shell/view-contribution";
import { TraceExplorerWidget, TRACE_EXPLORER_ID, TRACE_EXPLORER_LABEL } from "./trace-explorer-widget";

export class TraceExplorerContribution extends AbstractViewContribution<TraceExplorerWidget> {
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
}