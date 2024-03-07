/********************************************************************************
 * Copyright (C) 2024 Ericsson and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * SPDX-License-Identifier: EPL-2.0
 ********************************************************************************/

import { TheiaView } from '@theia/playwright';
import { TraceViewerApp } from './theia-trace-viewer-app';

/**
 * Represents the Trace Explorer view. This view is by default part of the left panel,
 * and is toggled by clicking on the "Trace Viewer" tab entry
 */
export class TraceExplorerView extends TheiaView {
    constructor(public app: TraceViewerApp) {
        super(
            {
                tabSelector: '#shell-tab-trace-explorer',
                viewSelector: '#trace-explorer',
                viewName: 'Trace Viewer'
            },
            app
        );
    }

    async isTraceServerStarted(): Promise<boolean> {
        const serverStatusElement = await this.page.waitForSelector('#server-status-id');
        const statusColor = await serverStatusElement.getAttribute('style');
        return statusColor?.includes('green')? true : false;
    }

}
