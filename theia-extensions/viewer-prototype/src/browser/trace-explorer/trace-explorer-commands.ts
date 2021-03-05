import { Command, MenuPath } from '@theia/core';

export namespace TraceExplorerMenus {
    export const PREFERENCE_EDITOR_CONTEXT_MENU: MenuPath = ['trace-explorer-opened-traces-context-menu'];
}
export namespace TraceExplorerCommands {
    export const OPEN_TRACE: Command = {
        id: 'trace-explorer:open-trace',
    };

    export const CLOSE_TRACE: Command = {
        id: 'trace-explorer:close-trace',
        label: 'Close Trace'
    };

    export const DELETE_TRACE: Command = {
        id: 'trace-explorer:delete-trace',
        label: 'Delete Trace'
    };
}
