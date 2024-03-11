/********************************************************************************
 * Copyright (C) 2022 EclipseSource and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * This Source Code may also be made available under the following Secondary
 * Licenses when the conditions for such availability set forth in the Eclipse
 * Public License v. 2.0 are satisfied: GNU General Public License, version 2
 * with the GNU Classpath Exception which is available at
 * https://www.gnu.org/software/classpath/license.html.
 *
 * SPDX-License-Identifier: EPL-2.0 OR GPL-2.0 WITH Classpath-exception-2.0
 ********************************************************************************/

// The following covers enhancements made after initially copying the file
// from the "theia-playwright-template":

/********************************************************************************
 * Copyright (C) 2024 Ericsson and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * SPDX-License-Identifier: EPL-2.0
 ********************************************************************************/

import { expect, test } from '@playwright/test';
import { TraceViewerApp } from './page-objects/theia-trace-viewer-app';
import { TheiaAppLoader } from '@theia/playwright';
import { TraceExplorerView } from './page-objects/trace-explorer-view';

let app: TraceViewerApp;
let traceExplorer: TraceExplorerView;

test.beforeAll(async ({ playwright, browser }) => {
    app = await TheiaAppLoader.load<TraceViewerApp>(
        { playwright, browser },
        undefined,
        TraceViewerApp
    );
    traceExplorer = app.getTraceExplorer();
});

test.describe('My Trace viewer application', () => {
    test('should show main content panel', async () => {
        expect(await app.isMainContentPanelVisible()).toBe(true);
    });
});

test.describe('My Trace Explorer View', () => {
    test('Is initially not visible', async () => {
        expect(await traceExplorer.isDisplayed()).toBe(false);
    });
    test('Once tab activated, becomes visible', async () => {
        expect(await traceExplorer.isDisplayed()).toBe(false);
        await traceExplorer.activate();
        expect(await traceExplorer.isDisplayed()).toBe(true);
    });
    test('Is closable', async () => {
        await traceExplorer.isClosable();
        expect(await traceExplorer.isDisplayed()).toBe(true);
    });
    test('Once closed, is not visible any more', async () => {
        expect(await traceExplorer.isDisplayed()).toBe(true);
        await traceExplorer.close();
        expect(await traceExplorer.isDisplayed()).toBe(false);
    });
    test('From closed, can be re-opened using the command palette', async () => {
        expect(await traceExplorer.isDisplayed()).toBe(false);
        await traceExplorer.open();
        await traceExplorer.activate();
        expect(await traceExplorer.isDisplayed()).toBe(true);
    });
    test('Trace Server status is shown as not started (red)', async () => {
        await traceExplorer.activate();
        expect(await traceExplorer.isTraceServerStarted()).toBe(false);
    });
});
