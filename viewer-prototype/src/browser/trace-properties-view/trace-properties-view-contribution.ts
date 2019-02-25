import { AbstractViewContribution } from "@theia/core/lib/browser/shell/view-contribution";
import { TRACE_PROPERTIES_ID, TRACE_PROPERTIES_LABEL, TracePropertiesWidget } from "./trace-properties-view-widget";

export class TracePropertiesContribution extends AbstractViewContribution<TracePropertiesWidget> {
    constructor() {
        super({
            widgetId: TRACE_PROPERTIES_ID,
            widgetName: TRACE_PROPERTIES_LABEL,
            defaultWidgetOptions: {
                area: 'bottom'
            },
            toggleCommandId: 'trace-properties:toggle'
        });
    }
}