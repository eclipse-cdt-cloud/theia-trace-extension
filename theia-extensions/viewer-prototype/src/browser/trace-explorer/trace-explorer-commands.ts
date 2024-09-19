import { Command, MenuPath } from '@theia/core';

export namespace TraceExplorerMenus {
    export const PREFERENCE_EDITOR_CONTEXT_MENU: MenuPath = ['trace-explorer-opened-traces-context-menu'];
}
export namespace TraceExplorerCommands {
    export const OPEN_TRACE: Command = {
        id: 'trace-explorer:open-trace'
    };

    export const CLOSE_TRACE: Command = {
        id: 'trace-explorer:close-trace',
        label: 'Close Trace'
    };

    export const REMOVE_TRACE: Command = {
        id: 'trace-explorer:remove-trace',
        label: 'Remove Trace'
    };

    export const OPEN_IN_TRACE_VIEWER: Command = {
        id: 'trace-explorer:open-in-trace-viewer',
        label: 'Open in Trace Viewer'
    };
}
