import { Command } from '@theia/core';

export const OpenTraceFolderCommand: Command = {
    id: 'open-trace-folder',
    label: 'Open Trace Folder'
};

export const OpenTraceFileCommand: Command = {
    id: 'open-trace-file',
    label: 'Open Trace File'
};

export const TraceViewerCommand: Command = {
    id: 'trace-viewer',
    label: 'Trace Viewer'
};

export const StartServerCommand: Command = {
    id: 'start-trace-server',
    label: 'Start Trace Server'
};

export const StopServerCommand: Command = {
    id: 'stop-trace-server',
    label: 'Stop Trace Server'
};

export const KeyboardShortcutsCommand: Command = {
    id: 'trace-viewer-keyboard-shortcuts',
    label: 'Trace Viewer Keyboard and Mouse Shortcuts'
};

export const OpenTraceWithRootPathCommand: Command = {
    id: 'open-trace-with-root-path',
    label: 'Open Trace With Root Path'
};

/**
 * A command to open a trace in the trace viewer.
 *
 * The command takes a parameter:
 *
 * path: a string containing the path to a trace
 */
export const OpenTraceWithPathCommand: Command = {
    id: 'open-trace-with-path',
    label: 'Open Trace With Path'
};
