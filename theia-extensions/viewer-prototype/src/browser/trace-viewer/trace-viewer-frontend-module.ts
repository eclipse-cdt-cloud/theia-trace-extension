import { ContainerModule, Container } from 'inversify';
import { WidgetFactory, OpenHandler, FrontendApplicationContribution, bindViewContribution, WebSocketConnectionProvider } from '@theia/core/lib/browser';
import { TraceViewerWidget, TraceViewerWidgetOptions } from './trace-viewer';
import { TraceViewerContribution } from './trace-viewer-contribution';
import { TraceViewerEnvironment } from '../../common/trace-viewer-environment';
import { TraceServerUrlProvider } from '../../common/trace-server-url-provider';
import { CommandContribution } from '@theia/core/lib/common';
import 'ag-grid-community/dist/styles/ag-grid.css';
import 'ag-grid-community/dist/styles/ag-theme-balham-dark.css';
import 'ag-grid-community/dist/styles/ag-theme-balham.css';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { TraceExplorerContribution } from '../trace-explorer/trace-explorer-contribution';
import { TraceExplorerWidget } from '../trace-explorer/trace-explorer-widget';
import { TspClientProvider } from '../tsp-client-provider';
import { TheiaMessageManager } from '../theia-message-manager';
import { TraceServerConnectionStatusService, TraceServerConnectionStatusContribution } from '../../browser/trace-server-status';
import { TraceServerUrlProviderImpl } from '../trace-server-url-provider-frontend-impl';
import { bindTraceServerPreferences } from '../trace-server-bindings';
import { TraceServerConfigService, traceServerPath } from '../../common/trace-server-config';

export default new ContainerModule(bind => {
    bind(TraceViewerEnvironment).toSelf().inRequestScope();
    bind(TraceServerUrlProviderImpl).toSelf().inSingletonScope();
    bind(FrontendApplicationContribution).toService(TraceServerUrlProviderImpl);
    bind(TraceServerUrlProvider).toService(TraceServerUrlProviderImpl);
    bind(TspClientProvider).toSelf().inSingletonScope();
    bind(TheiaMessageManager).toSelf().inSingletonScope();

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
    bind(FrontendApplicationContribution).toService(TraceExplorerContribution);
    bind(WidgetFactory).toDynamicValue(context => ({
        id: TraceExplorerWidget.ID,
        createWidget: () => TraceExplorerWidget.createWidget(context.container)
    })).inSingletonScope();

    bind(TraceServerConfigService).toDynamicValue(ctx => {
        const connection = ctx.container.get(WebSocketConnectionProvider);
        return connection.createProxy<TraceServerConfigService>(traceServerPath);
    }).inSingletonScope();
    bind(TraceServerConnectionStatusService).toSelf().inSingletonScope();
    bind(FrontendApplicationContribution).toService(TraceServerConnectionStatusService);
    bind(TraceServerConnectionStatusContribution).toSelf().inSingletonScope();
    bind(FrontendApplicationContribution).toService(TraceServerConnectionStatusContribution);
    bindTraceServerPreferences(bind);
    // bindViewContribution(bind, TracePropertiesContribution);
    // bind(TracePropertiesWidget).toSelf();
    // bind(WidgetFactory).toDynamicValue(context => ({
    //     id: TRACE_PROPERTIES_ID,
    //     createWidget: () => context.container.get<TracePropertiesWidget>(TracePropertiesWidget)
    // }));
});
