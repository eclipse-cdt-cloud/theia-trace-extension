import { injectable, inject, postConstruct, interfaces, Container } from 'inversify';
import { TraceExplorerViewsWidget } from './trace-explorer-sub-widgets/trace-explorer-views-widget';
import { ViewContainer, BaseWidget, Message, PanelLayout } from '@theia/core/lib/browser';
import { TraceExplorerTooltipWidget } from './trace-explorer-sub-widgets/trace-explorer-tooltip-widget';
import { TraceExplorerOpenedTracesWidget } from './trace-explorer-sub-widgets/trace-explorer-opened-traces-widget';
import { TraceExplorerPlaceholderWidget } from './trace-explorer-sub-widgets/trace-explorer-placeholder-widget';
import { OutputAddedSignalPayload } from './output-added-signal-payload';
import { Event } from '@theia/core';
import { Experiment } from 'tsp-typescript-client/lib/models/experiment';

@injectable()
export class TraceExplorerWidget extends BaseWidget {
    static LABEL = 'Trace Viewer';
    static ID = 'trace-explorer';
    protected traceViewsContainer!: ViewContainer;
    @inject(TraceExplorerViewsWidget) protected readonly viewsWidget!: TraceExplorerViewsWidget;
    @inject(TraceExplorerOpenedTracesWidget) protected readonly openedTracesWidget!: TraceExplorerOpenedTracesWidget;
    @inject(TraceExplorerTooltipWidget) protected readonly tooltipWidget!: TraceExplorerTooltipWidget;
    @inject(TraceExplorerPlaceholderWidget) protected readonly placeholderWidget!: TraceExplorerPlaceholderWidget;
    @inject(ViewContainer.Factory) protected readonly viewContainerFactory!: ViewContainer.Factory;

    get outputAddedSignal(): Event<OutputAddedSignalPayload> {
        return this.viewsWidget.outputAddedSignal;
    }

    openExperiment(traceUUID: string): void {
        return this.openedTracesWidget.openExperiment(traceUUID);
    }

    closeExperiment(traceUUID: string): void {
        return this.openedTracesWidget.closeExperiment(traceUUID);
    }

    deleteExperiment(traceUUID: string): void {
        return this.openedTracesWidget.deleteExperiment(traceUUID);
    }

    onOpenedTracesWidgetActivated(experiment: Experiment): void {
        return this.openedTracesWidget.onWidgetActivated(experiment);
    }

    getExperiment(traceUUID: string): Experiment | undefined {
        return this.openedTracesWidget.getExperiment(traceUUID);
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
        this.toDispose.push(this.openedTracesWidget.widgetWasUpdated(() => this.update()));
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
        this.update();
    }

    protected onUpdateRequest(msg: Message): void {
        super.onUpdateRequest(msg);
        const { openedExperiments } = this.openedTracesWidget;
        if (openedExperiments.length) {
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
