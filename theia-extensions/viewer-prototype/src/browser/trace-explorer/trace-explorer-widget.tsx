import { injectable, inject, postConstruct, interfaces, Container } from 'inversify';
import { TraceExplorerViewsWidget } from './trace-explorer-sub-widgets/trace-explorer-views-widget';
import { ViewContainer, BaseWidget, Message, PanelLayout } from '@theia/core/lib/browser';
import { TraceExplorerTooltipWidget } from './trace-explorer-sub-widgets/trace-explorer-tooltip-widget';
import { TraceExplorerOpenedTracesWidget } from './trace-explorer-sub-widgets/trace-explorer-opened-traces-widget';
import { TraceExplorerPlaceholderWidget } from './trace-explorer-sub-widgets/trace-explorer-placeholder-widget';
import { signalManager, Signals } from '@trace-viewer/base/lib/signals/signal-manager';
import { OpenedTracesUpdatedSignalPayload } from '@trace-viewer/base/src/signals/opened-traces-updated-signal-payload';

@injectable()
export class TraceExplorerWidget extends BaseWidget {
    static LABEL = 'Trace Viewer';
    static ID = 'trace-explorer';
    protected traceViewsContainer!: ViewContainer;
    private _numberOfOpenedTraces = 0;
    @inject(TraceExplorerViewsWidget) protected readonly viewsWidget!: TraceExplorerViewsWidget;
    @inject(TraceExplorerOpenedTracesWidget) protected readonly openedTracesWidget!: TraceExplorerOpenedTracesWidget;
    @inject(TraceExplorerTooltipWidget) protected readonly tooltipWidget!: TraceExplorerTooltipWidget;
    @inject(TraceExplorerPlaceholderWidget) protected readonly placeholderWidget!: TraceExplorerPlaceholderWidget;
    @inject(ViewContainer.Factory) protected readonly viewContainerFactory!: ViewContainer.Factory;

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
        child.bind(TraceExplorerTooltipWidget).toSelf();
        child.bind(TraceExplorerWidget).toSelf().inSingletonScope();
        return child;
    }

    @postConstruct()
    init(): void {
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
        this.traceViewsContainer.addWidget(this.tooltipWidget);
        this.toDispose.push(this.traceViewsContainer);
        const layout = this.layout = new PanelLayout();
        layout.addWidget(this.placeholderWidget);
        layout.addWidget(this.traceViewsContainer);
        this.node.tabIndex = 0;
        signalManager().on(Signals.OPENED_TRACES_UPDATED, this.onUpdateSignal);
        this.update();
    }

    dispose(): void {
        super.dispose();
        signalManager().off(Signals.OPENED_TRACES_UPDATED, this.onUpdateSignal);
    }

    protected onUpdateSignal = (payload: OpenedTracesUpdatedSignalPayload): void => this.doHandleOpenedTracesChanged(payload);
    protected doHandleOpenedTracesChanged(payload: OpenedTracesUpdatedSignalPayload): void {
        this._numberOfOpenedTraces = payload.getNumberOfOpenedTraces();
        this.update();
    }

    protected onUpdateRequest(msg: Message): void {
        super.onUpdateRequest(msg);
        if (this._numberOfOpenedTraces > 0) {
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

}
