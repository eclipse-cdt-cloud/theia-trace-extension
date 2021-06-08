import { Command } from '@theia/core';

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
