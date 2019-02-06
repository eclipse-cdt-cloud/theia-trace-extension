/********************************************************************************
 * Copyright (C) 2018 Ericsson and others.
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

import { ContainerModule, Container } from 'inversify';
import { WidgetFactory, OpenHandler, FrontendApplicationContribution, bindViewContribution } from '@theia/core/lib/browser';
import { TraceViewerWidget, TraceViewerWidgetOptions } from './trace-viewer-widget';
import { TraceViewerContribution } from './trace-viewer-contribution';
import { CommandContribution } from '@theia/core/lib/common';

import 'ag-grid-community/dist/styles/ag-grid.css';
import 'ag-grid-community/dist/styles/ag-theme-balham-dark.css';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import '../../src/browser/style/trace-viewer.css';
import '../../src/browser/style/trace-explorer.css';
import { TraceExplorerContribution } from './trace-explorer/trace-explorer-contribution';
import { TRACE_EXPLORER_ID, TraceExplorerWidget } from './trace-explorer/trace-explorer-widget';
import { TspClient } from 'tsp-typescript-client/lib/protocol/tsp-client';
import { TraceManager } from '../common/trace-manager';

export default new ContainerModule(bind => {
    bind(TspClient).toDynamicValue(() => new TspClient('http://localhost:8080/tsp/api')).inSingletonScope();
    bind(TraceManager).toSelf().inSingletonScope();
    
    bind(TraceViewerWidget).toSelf();
    bind<WidgetFactory>(WidgetFactory).toDynamicValue(context => ({
        id: TraceViewerWidget.ID,
        async createWidget(options: TraceViewerWidgetOptions): Promise<TraceViewerWidget> {
            const child = new Container({ defaultScope: 'Singleton' });
            child.parent = context.container;
            // const traceURI = new URI(uri);
            child.bind(TraceViewerWidgetOptions).toConstantValue(options);
            return child.get(TraceViewerWidget);
        }
    })).inSingletonScope();

    bind(TraceViewerContribution).toSelf().inSingletonScope();
    [CommandContribution, OpenHandler, FrontendApplicationContribution].forEach(serviceIdentifier =>
        bind(serviceIdentifier).toService(TraceViewerContribution)
    );

    bindViewContribution(bind, TraceExplorerContribution);
    bind(TraceExplorerWidget).toSelf();
    // bind(FrontendApplicationContribution).toService(TraceExplorerContribution);
    bind(WidgetFactory).toDynamicValue(context => ({
        id: TRACE_EXPLORER_ID,
        createWidget: () => context.container.get<TraceExplorerWidget>(TraceExplorerWidget)
    }));

    // bindFileNavigatorPreferences(bind);
    // bind(FileNavigatorFilter).toSelf().inSingletonScope();

    // bind(NavigatorContextKeyService).toSelf().inSingletonScope();

    // bindViewContribution(bind, FileNavigatorContribution);
    // bind(FrontendApplicationContribution).toService(FileNavigatorContribution);

    // bind(KeybindingContext).to(NavigatorActiveContext).inSingletonScope();

    // bind(FileNavigatorWidget).toDynamicValue(ctx =>
    //     createFileNavigatorWidget(ctx.container)
    // );
    // bind(WidgetFactory).toDynamicValue(context => ({
    //     id: FILE_NAVIGATOR_ID,
    //     createWidget: () => context.container.get<FileNavigatorWidget>(FileNavigatorWidget)
    // }));
});
