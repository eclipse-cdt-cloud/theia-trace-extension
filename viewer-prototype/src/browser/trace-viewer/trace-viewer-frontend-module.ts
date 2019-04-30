import { ContainerModule, Container } from 'inversify';
import { WidgetFactory, OpenHandler, FrontendApplicationContribution, bindViewContribution } from '@theia/core/lib/browser';
import { TraceViewerWidget, TraceViewerWidgetOptions } from './trace-viewer';
import { TraceViewerContribution } from './trace-viewer-contribution';
import { CommandContribution } from '@theia/core/lib/common';

import 'ag-grid-community/dist/styles/ag-grid.css';
import 'ag-grid-community/dist/styles/ag-theme-balham-dark.css';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import '../../../src/browser/style/trace-viewer.css';
import '../../../src/browser/style/trace-context-style.css';
import '../../../src/browser/style/output-components-style.css';
import '../../../src/browser/style/trace-explorer.css';
// import 'semantic-ui-css/semantic.min.css';
import { TraceExplorerContribution } from '../trace-explorer/trace-explorer-contribution';
import { TRACE_EXPLORER_ID, TraceExplorerWidget } from '../trace-explorer/trace-explorer-widget';
import { TspClient } from 'tsp-typescript-client/lib/protocol/tsp-client';
import { TraceManager } from '../../common/trace-manager';
// import { TracePropertiesContribution } from '../trace-properties-view/trace-properties-view-contribution';
// import { TracePropertiesWidget, TRACE_PROPERTIES_ID } from '../trace-properties-view/trace-properties-view-widget';

export default new ContainerModule(bind => {
    bind(TspClient).toDynamicValue(() => new TspClient('http://localhost:8080/tsp/api')).inSingletonScope();
    bind(TraceManager).toSelf().inSingletonScope();

    bind(TraceViewerWidget).toSelf();
    bind<WidgetFactory>(WidgetFactory).toDynamicValue(context => ({
        id: TraceViewerWidget.ID,
        async createWidget(options: TraceViewerWidgetOptions): Promise<TraceViewerWidget> {
            const child = new Container({ defaultScope: 'Singleton' });
            child.parent = context.container;
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

    // bindViewContribution(bind, TracePropertiesContribution);
    // bind(TracePropertiesWidget).toSelf();
    // bind(WidgetFactory).toDynamicValue(context => ({
    //     id: TRACE_PROPERTIES_ID,
    //     createWidget: () => context.container.get<TracePropertiesWidget>(TracePropertiesWidget)
    // }));
});
