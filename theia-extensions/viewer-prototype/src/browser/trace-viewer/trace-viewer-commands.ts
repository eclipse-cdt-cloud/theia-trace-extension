import { Command } from '@theia/core';

export const OpenTraceCommand: Command = {
    id: 'open-trace',
    label: 'Open Trace'
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
 * The command takes two parameters:
 *
 * path: a string containing the path to a trace
 * options: an optional TraceViewerWidgetOpenerOptions
 */
export const OpenTraceWithPathCommand: Command = {
    id: 'open-trace-with-path',
    label: 'Open Trace With Path'
};
