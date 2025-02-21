import { ContainerModule, Container } from '@theia/core/shared/inversify';
import {
    WidgetFactory,
    OpenHandler,
    FrontendApplicationContribution,
    bindViewContribution,
    WebSocketConnectionProvider,
    KeybindingContribution
} from '@theia/core/lib/browser';
import { TraceViewerWidget, TraceViewerWidgetOptions } from './trace-viewer';
import { TraceViewerContribution } from './trace-viewer-contribution';
import { CommandContribution } from '@theia/core/lib/common';
import '@ag-grid-community/styles/ag-grid.css';
import '@ag-grid-community/styles/ag-theme-balham.css';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { TraceExplorerContribution } from '../trace-explorer/trace-explorer-contribution';
import { TraceExplorerWidget } from '../trace-explorer/trace-explorer-widget';
import { TspClientProvider } from '../tsp-client-provider-impl';
import { TheiaMessageManager } from '../theia-message-manager';
import { bindTraceServerPreferences } from '../trace-server-bindings';
import { TRACE_SERVER_CLIENT, TraceServerConfigService, traceServerPath } from '../../common/trace-server-config';
import { TabBarToolbarContribution } from '@theia/core/lib/browser/shell/tab-bar-toolbar';
import { TraceViewerToolbarContribution } from './trace-viewer-toolbar-contribution';
import { BackendFileService, backendFileServicePath } from '../../common/backend-file-service';
import { TraceServerConnectionStatusClientImpl } from '../trace-server-connection-status-client-impl';
import { bindTraceOverviewPreferences } from '../trace-overview-binding';
import { ITspClient } from 'tsp-typescript-client/lib/protocol/tsp-client';
import { PortPreferenceProxy, TRACE_SERVER_PORT } from '../../common/trace-server-url-provider';
import { PreferencesFrontendContribution } from '../preferences-frontend-contribution';
import {
    TRACE_SERVER_CONNECTION_STATUS,
    TraceServerConnectionStatusBackend,
    TraceServerConnectionStatusClient
} from '../../common/trace-server-connection-status';
import { TheiaRpcTspProxy, TspClientProxy } from '../theia-rpc-tsp-proxy';

export default new ContainerModule(bind => {
    bind(PreferencesFrontendContribution).toSelf().inSingletonScope();
    bind(FrontendApplicationContribution).toService(PreferencesFrontendContribution);
    bind(TspClientProvider).toSelf().inSingletonScope();
    bind(TheiaMessageManager).toSelf().inSingletonScope();

    bind(TraceViewerToolbarContribution).toSelf().inSingletonScope();
    bind(FrontendApplicationContribution).toService(TraceViewerToolbarContribution);
    bind(TabBarToolbarContribution).toService(TraceViewerToolbarContribution);
    bind(CommandContribution).toService(TraceViewerToolbarContribution);
    bind(TraceServerConnectionStatusClient).to(TraceServerConnectionStatusClientImpl).inSingletonScope();
    bind(TraceViewerWidget).toSelf();
    bind<WidgetFactory>(WidgetFactory)
        .toDynamicValue(context => ({
            id: TraceViewerWidget.ID,
            async createWidget(options: TraceViewerWidgetOptions): Promise<TraceViewerWidget> {
                const child = new Container({ defaultScope: 'Singleton' });
                child.parent = context.container;
                child.bind(TraceViewerWidgetOptions).toConstantValue(options);
                return child.get(TraceViewerWidget);
            }
        }))
        .inSingletonScope();

    bind(TraceViewerContribution).toSelf().inSingletonScope();
    [CommandContribution, OpenHandler, FrontendApplicationContribution, KeybindingContribution].forEach(
        serviceIdentifier => bind(serviceIdentifier).toService(TraceViewerContribution)
    );

    bindViewContribution(bind, TraceExplorerContribution);
    bind(FrontendApplicationContribution).toService(TraceExplorerContribution);
    bind(WidgetFactory)
        .toDynamicValue(context => ({
            id: TraceExplorerWidget.ID,
            createWidget: () => TraceExplorerWidget.createWidget(context.container)
        }))
        .inSingletonScope();

    bind(TraceServerConfigService)
        .toDynamicValue(ctx => {
            const connection = ctx.container.get(WebSocketConnectionProvider);
            return connection.createProxy<TraceServerConfigService>(traceServerPath);
        })
        .inSingletonScope();
    bindTraceServerPreferences(bind);

    bindTraceOverviewPreferences(bind);

    bind(BackendFileService)
        .toDynamicValue(ctx => {
            const connection = ctx.container.get(WebSocketConnectionProvider);
            return connection.createProxy<BackendFileService>(backendFileServicePath);
        })
        .inSingletonScope();

    bind(TspClientProxy)
        .toDynamicValue(ctx => {
            const connection = ctx.container.get(WebSocketConnectionProvider);
            return connection.createProxy<ITspClient>(TRACE_SERVER_CLIENT);
        })
        .inSingletonScope();

    bind(PortPreferenceProxy)
        .toDynamicValue(ctx => {
            const connection = ctx.container.get(WebSocketConnectionProvider);
            return connection.createProxy<PortPreferenceProxy>(TRACE_SERVER_PORT);
        })
        .inSingletonScope();

    bind(TraceServerConnectionStatusBackend)
        .toDynamicValue(ctx => {
            const connection = ctx.container.get(WebSocketConnectionProvider);
            const client = ctx.container.get<TraceServerConnectionStatusClient>(TraceServerConnectionStatusClient);
            return connection.createProxy<TraceServerConnectionStatusBackend>(TRACE_SERVER_CONNECTION_STATUS, client);
        })
        .inSingletonScope();

    bind(TheiaRpcTspProxy).toSelf().inSingletonScope();
});
