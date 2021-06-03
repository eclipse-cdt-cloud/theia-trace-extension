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
}

export const TRACE_VIEWER_TOOLBAR_COMMAND_FILTER: Command = {
    id: 'trace.viewer.toolbar.filter',
    label: 'Trace Viewer Toolbar Filter',
    iconClass: 'fa fa-filter fa-lg',
};

export namespace TraceViewerToolbarFilterMenus {
    export const TOOLBAR_FILTER_MARKERS_MENU: MenuPath = ['trace-viewer-filter-markers-menu'];
}
