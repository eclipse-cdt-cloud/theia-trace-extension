import { injectable, inject, postConstruct, interfaces, Container } from '@theia/core/shared/inversify';
import { TraceExplorerViewsWidget } from './trace-explorer-sub-widgets/theia-trace-explorer-views-widget';
import { ViewContainer, BaseWidget, Message, PanelLayout } from '@theia/core/lib/browser';
import { TraceExplorerItemPropertiesWidget } from './trace-explorer-sub-widgets/theia-trace-explorer-properties-widget';
import { TraceExplorerOpenedTracesWidget } from './trace-explorer-sub-widgets/theia-trace-explorer-opened-traces-widget';
import { TraceExplorerPlaceholderWidget } from './trace-explorer-sub-widgets/theia-trace-explorer-placeholder-widget';
import { TraceExplorerServerStatusWidget } from './trace-explorer-sub-widgets/trace-explorer-server-status-widget';
import { TraceExplorerTimeRangeDataWidget } from './trace-explorer-sub-widgets/theia-trace-explorer-time-range-data-widget';
import { signalManager } from 'traceviewer-base/lib/signals/signal-manager';
import { OpenedTracesUpdatedSignalPayload } from 'traceviewer-base/lib/signals/opened-traces-updated-signal-payload';
import {
    TraceServerConnectionStatusBackend,
    TraceServerConnectionStatusClient
} from '../../common/trace-server-connection-status';

@injectable()
export class TraceExplorerWidget extends BaseWidget {
    static LABEL = 'Trace Viewer';
    static ID = 'trace-explorer';
    protected traceViewsContainer!: ViewContainer;
    private _numberOfOpenedTraces = 0;
    @inject(TraceExplorerViewsWidget) protected readonly viewsWidget!: TraceExplorerViewsWidget;
    @inject(TraceExplorerOpenedTracesWidget) protected readonly openedTracesWidget!: TraceExplorerOpenedTracesWidget;
    @inject(TraceExplorerItemPropertiesWidget)
    protected readonly itemPropertiesWidget!: TraceExplorerItemPropertiesWidget;
    @inject(TraceExplorerPlaceholderWidget) protected readonly placeholderWidget!: TraceExplorerPlaceholderWidget;
    @inject(TraceExplorerServerStatusWidget) protected readonly serverStatusWidget!: TraceExplorerServerStatusWidget;
    @inject(TraceExplorerTimeRangeDataWidget) protected readonly timeRangeDataWidget!: TraceExplorerTimeRangeDataWidget;
    @inject(ViewContainer.Factory) protected readonly viewContainerFactory!: ViewContainer.Factory;
    @inject(TraceServerConnectionStatusClient)
    protected readonly connectionStatusClient: TraceServerConnectionStatusClient;
    // This is needed to initialize the backend service
    @inject(TraceServerConnectionStatusBackend)
    protected traceServerConnectionStatusProxy: TraceServerConnectionStatusBackend;

    openExperiment(traceUUID: string): void {
        return this.openedTracesWidget.openExperiment(traceUUID);
    }

    closeExperiment(traceUUID: string): void {
        return this.openedTracesWidget.closeExperiment(traceUUID);
    }

    deleteExperiment(traceUUID: string): void {
        return this.openedTracesWidget.deleteExperiment(traceUUID);
    }

    static createWidget(parent: interfaces.Container): TraceExplorerWidget {
        return TraceExplorerWidget.createContainer(parent).get(TraceExplorerWidget);
    }

    static createContainer(parent: interfaces.Container): Container {
        const child = new Container({ defaultScope: 'Singleton' });
        child.parent = parent;
        child.bind(TraceExplorerViewsWidget).toSelf();
        child.bind(TraceExplorerOpenedTracesWidget).toSelf();
        child.bind(TraceExplorerPlaceholderWidget).toSelf();
        child.bind(TraceExplorerServerStatusWidget).toSelf();
        child.bind(TraceExplorerItemPropertiesWidget).toSelf();
        child.bind(TraceExplorerTimeRangeDataWidget).toSelf();
        child.bind(TraceExplorerWidget).toSelf().inSingletonScope();
        return child;
    }

    @postConstruct()
    protected init(): void {
        this.id = TraceExplorerWidget.ID;
        this.title.label = TraceExplorerWidget.LABEL;
        this.title.caption = TraceExplorerWidget.LABEL;
        this.title.iconClass = 'trace-explorer-tab-icon';
        this.title.closable = true;
        this.traceViewsContainer = this.viewContainerFactory({
            id: this.id
        });
        this.traceViewsContainer.addWidget(this.openedTracesWidget);
        this.traceViewsContainer.addWidget(this.viewsWidget);
        this.traceViewsContainer.addWidget(this.itemPropertiesWidget);
        this.traceViewsContainer.addWidget(this.timeRangeDataWidget);
        this.toDispose.push(this.traceViewsContainer);
        const layout = (this.layout = new PanelLayout());
        layout.addWidget(this.serverStatusWidget);
        layout.addWidget(this.placeholderWidget);
        layout.addWidget(this.traceViewsContainer);
        this.node.tabIndex = 0;
        signalManager().on('OPENED_TRACES_UPDATED', this.onUpdateSignal);
        this.connectionStatusClient.addServerStatusChangeListener(this.onServerStatusChange);
        this.update();
    }

    dispose(): void {
        super.dispose();
        signalManager().off('OPENED_TRACES_UPDATED', this.onUpdateSignal);
        this.connectionStatusClient.removeServerStatusChangeListener(this.onServerStatusChange);
    }

    protected onUpdateSignal = (payload: OpenedTracesUpdatedSignalPayload): void =>
        this.doHandleOpenedTracesChanged(payload);
    protected doHandleOpenedTracesChanged(payload: OpenedTracesUpdatedSignalPayload): void {
        this._numberOfOpenedTraces = payload.getNumberOfOpenedTraces();
        this.update();
    }

    protected onUpdateRequest(msg: Message): void {
        super.onUpdateRequest(msg);
        if (this._numberOfOpenedTraces > 0 && this.connectionStatusClient.getStatus() === true) {
            this.traceViewsContainer.show();
            this.placeholderWidget.hide();
        } else {
            this.traceViewsContainer.hide();
            this.placeholderWidget.show();
        }
    }

    protected onActivateRequest(msg: Message): void {
        super.onActivateRequest(msg);
        this.node.focus();
    }

    protected async onAfterShow(): Promise<void> {
        this.connectionStatusClient.activate();
        const status = await this.traceServerConnectionStatusProxy.getStatus();
        this.connectionStatusClient.updateStatus(status);
    }

    protected onAfterHide(): void {
        this.connectionStatusClient.deactivate();
    }

    protected onServerStatusChange = (status: boolean): void => this.doHandleOnServerStatusChange(status);

    protected doHandleOnServerStatusChange(status: boolean): void {
        this.serverStatusWidget.updateStatus(status);
        this.update();
    }
}
