import { injectable } from 'inversify';
import { Command, CommandRegistry, CommandContribution } from '@theia/core';
import { WidgetOpenHandler } from '@theia/core/lib/browser';
import URI from '@theia/core/lib/common/uri';
import { TraceViewerWidget, TraceViewerWidgetOptions } from './trace-viewer';

export namespace TraceViewerCommands {
    export const OPEN: Command = {
        id: 'trace:open',
        label: 'Open Trace'
    };
}

@injectable()
export class TraceViewerContribution extends WidgetOpenHandler<TraceViewerWidget> implements CommandContribution {
    protected createWidgetOptions(uri: URI): TraceViewerWidgetOptions {
        return {
            traceURI: uri.path.toString()
        };
    }

    readonly id = TraceViewerWidget.ID;
    readonly label = 'Open trace';

    registerCommands(registry: CommandRegistry): void {
        registry.registerCommand(TraceViewerCommands.OPEN);
    }

    canHandle(uri: URI): number {
        return 100;
    }
}
