import { Command, MenuPath } from '@theia/core';

export namespace TraceViewerToolbarCommands {

    export const ZOOM_IN: Command = {
        id: 'trace.viewer.zoomin',
        label: 'Zoom In',
        iconClass: 'fa fa-plus-square-o fa-lg',
    };

    export const ZOOM_OUT: Command = {
        id: 'trace.viewer.toolbar.zoomout',
        label: 'Zoom Out',
        iconClass: 'fa fa-minus-square-o fa-lg',
    };

    export const RESET: Command = {
        id: 'trace.viewer.toolbar.reset',
        label: 'Reset',
        iconClass: 'fa fa-home fa-lg',
    };

    export const FILTER: Command = {
        id: 'trace.viewer.toolbar.filter',
        label: 'Trace Viewer Toolbar Filter',
        iconClass: 'fa fa-filter fa-lg',
    };

    export const MARKER_SETS: Command = {
        id: 'trace.viewer.toolbar.markersets',
        label: 'Markers',
        iconClass: 'fa fa-bars fa-lg',
    };
    export const OPEN_TRACE: Command = {
        id: 'trace.viewer.openTrace',
        label: 'Open Trace',
        iconClass: 'fa fa-folder-open-o fa-lg',
    };

    export const CHARTS_CHEATSHEET: Command = {
        id: 'trace.viewer.toolbar.cheatsheet',
        label: 'Keyboard Shortcuts (CTRL / command + F1)',
        iconClass: 'fa fa-info-circle fa-lg',
    };
}

export namespace TraceViewerToolbarMenus {
    export const MARKER_CATEGORIES_MENU: MenuPath = ['trace-viewer-marker-categories-menu'];
    export const MARKER_SETS_MENU: MenuPath = ['trace-viewer-marker-sets-menu'];
}
