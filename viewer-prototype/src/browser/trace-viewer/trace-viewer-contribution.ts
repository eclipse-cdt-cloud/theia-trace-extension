import { injectable, inject } from 'inversify';
import { Command, CommandRegistry, CommandContribution } from '@theia/core';
import { WidgetOpenHandler } from '@theia/core/lib/browser';
import URI from '@theia/core/lib/common/uri';
import { TraceViewerWidget, TraceViewerWidgetOptions } from './trace-viewer';
import { FileDialogService, OpenFileDialogProps } from '@theia/filesystem/lib/browser';
import { WorkspaceService } from '@theia/workspace/lib/browser/workspace-service';

export namespace TraceViewerCommands {
    export const OPEN: Command = {
        id: 'trace:open',
        label: 'Open Trace'
    };
}

const OpenTraceCommand: Command = {
    id: 'open-trace',
    label: 'Open Trace'
};

@injectable()
export class TraceViewerContribution extends WidgetOpenHandler<TraceViewerWidget> implements CommandContribution {

    @inject(FileDialogService)
    protected readonly fileDialogService!: FileDialogService;
    @inject(WorkspaceService)
    protected readonly workspaceService!: WorkspaceService;

    readonly id = TraceViewerWidget.ID;
    readonly label = TraceViewerCommands.OPEN.label;

    protected createWidgetOptions(uri: URI): TraceViewerWidgetOptions {
        return {
            traceURI: uri.path.toString()
        };
    }

    public async openDialog(): Promise<void> {
        const props: OpenFileDialogProps = {
            title: 'Open Trace',
            // Only support selecting folders, both folders and file doesn't work in Electron (issue #227)
            canSelectFolders: true,
            canSelectFiles: false
        };
        const root = this.workspaceService.tryGetRoots()[0];
        const fileURI = await this.fileDialogService.showOpenDialog(props, root);
        if (fileURI) {
            await this.open(fileURI);
        }
    }

    registerCommands(registry: CommandRegistry): void {
        registry.registerCommand(TraceViewerCommands.OPEN);
        registry.registerCommand(OpenTraceCommand, {
            execute: () => {
                this.openDialog();
            }
        });
    }

    canHandle(_uri: URI): number {
        return 100;
    }
}
