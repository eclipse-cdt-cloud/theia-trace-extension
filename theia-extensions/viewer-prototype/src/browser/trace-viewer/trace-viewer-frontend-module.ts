import { ContainerModule, Container } from 'inversify';
import { WidgetFactory, OpenHandler, FrontendApplicationContribution, bindViewContribution, WebSocketConnectionProvider, KeybindingContribution } from '@theia/core/lib/browser';
import { TraceViewerWidget, TraceViewerWidgetOptions } from './trace-viewer';
import { TraceViewerContribution } from './trace-viewer-contribution';
import { TraceServerUrlProvider } from '../../common/trace-server-url-provider';
import { CommandContribution } from '@theia/core/lib/common';
import 'ag-grid-community/dist/styles/ag-grid.css';
import 'ag-grid-community/dist/styles/ag-theme-balham-dark.css';
import 'ag-grid-community/dist/styles/ag-theme-balham.css';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { TraceExplorerContribution } from '../trace-explorer/trace-explorer-contribution';
import { TraceExplorerWidget } from '../trace-explorer/trace-explorer-widget';
import { TspClientProvider } from '../tsp-client-provider-impl';
import { TheiaMessageManager } from '../theia-message-manager';
import { TraceServerUrlProviderImpl } from '../trace-server-url-provider-frontend-impl';
import { bindTraceServerPreferences } from '../trace-server-bindings';
import { TraceServerConfigService, traceServerPath } from '../../common/trace-server-config';
import { TabBarToolbarContribution } from '@theia/core/lib/browser/shell/tab-bar-toolbar';
import { TraceViewerToolbarContribution } from './trace-viewer-toolbar-contribution';
import { LazyTspClientFactory } from 'traceviewer-base/lib/lazy-tsp-client';
import { BackendFileService, backendFileServicePath } from '../../common/backend-file-service';
import { TraceServerConnectionStatusService } from '../trace-server-status';
import { bindTraceOverviewPreferences } from '../trace-overview-binding';

export default new ContainerModule(bind => {
    bind(TraceServerUrlProviderImpl).toSelf().inSingletonScope();
    bind(FrontendApplicationContribution).toService(TraceServerUrlProviderImpl);
    bind(TraceServerUrlProvider).toService(TraceServerUrlProviderImpl);
    bind(LazyTspClientFactory).toFunction(LazyTspClientFactory);
    bind(TspClientProvider).toSelf().inSingletonScope();
    bind(TheiaMessageManager).toSelf().inSingletonScope();

    bind(TraceViewerToolbarContribution).toSelf().inSingletonScope();
    bind(FrontendApplicationContribution).toService(TraceViewerToolbarContribution);
    bind(TabBarToolbarContribution).toService(TraceViewerToolbarContribution);
    bind(CommandContribution).toService(TraceViewerToolbarContribution);
    bind(TraceServerConnectionStatusService).toSelf().inSingletonScope();
    bind(FrontendApplicationContribution).toService(TraceServerConnectionStatusService);

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
    [CommandContribution, OpenHandler, FrontendApplicationContribution, KeybindingContribution].forEach(serviceIdentifier =>
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
    bindTraceServerPreferences(bind);

    bindTraceOverviewPreferences(bind);

    bind(BackendFileService).toDynamicValue(ctx => {
        const connection = ctx.container.get(WebSocketConnectionProvider);
        return connection.createProxy<BackendFileService>(backendFileServicePath);
    }).inSingletonScope();
});
