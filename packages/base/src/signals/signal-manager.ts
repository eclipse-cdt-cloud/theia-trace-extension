import { EventEmitter } from 'events';
import { OutputDescriptor } from 'tsp-typescript-client';
import { Experiment } from 'tsp-typescript-client/lib/models/experiment';
import { Trace } from 'tsp-typescript-client/lib/models/trace';
import { OpenedTracesUpdatedSignalPayload } from './opened-traces-updated-signal-payload';
import { OutputAddedSignalPayload } from './output-added-signal-payload';
import { TimeRangeUpdatePayload } from './time-range-data-signal-payloads';
import { ContextMenuContributedSignalPayload } from './context-menu-contributed-signal-payload';
import { ContextMenuItemClickedSignalPayload } from './context-menu-item-clicked-signal-payload';
import { RowSelectionsChangedSignalPayload } from './row-selections-changed-signal-payload';
import { ItemPropertiesSignalPayload } from './item-properties-signal-payload';

export declare interface SignalManager {
    fireTraceOpenedSignal(trace: Trace): void;
    fireTraceDeletedSignal(trace: Trace): void;
    fireExperimentExperimentSignal(experiment: Experiment): void;
    fireExperimentClosedSignal(experiment: Experiment): void;
    fireExperimentDeletedSignal(experiment: Experiment): void;
    fireExperimentSelectedSignal(experiment: Experiment | undefined): void;
    fireExperimentUpdatedSignal(experiment: Experiment): void;
    fireOpenedTracesChangedSignal(payload: OpenedTracesUpdatedSignalPayload): void;
    fireOutputAddedSignal(payload: OutputAddedSignalPayload): void;
    fireItemPropertiesSignalUpdated(payload: ItemPropertiesSignalPayload): void;
    fireThemeChangedSignal(theme: string): void;
    // TODO - Refactor or remove this signal.  Similar signal to fireRequestSelectionRangeChange
    fireSelectionChangedSignal(payload: { [key: string]: string }): void;
    fireRowSelectionsChanged(payload: RowSelectionsChangedSignalPayload): void;
    fireCloseTraceViewerTabSignal(traceUUID: string): void;
    fireTraceViewerTabActivatedSignal(experiment: Experiment): void;
    fireUpdateZoomSignal(hasZoomedIn: boolean): void;
    fireResetZoomSignal(): void;
    fireMarkerCategoriesFetchedSignal(): void;
    fireMarkerSetsFetchedSignal(): void;
    fireMarkerCategoryClosedSignal(payload: { traceViewerId: string; markerCategory: string }): void;
    fireTraceServerStartedSignal(): void;
    fireUndoSignal(): void;
    fireRedoSignal(): void;
    fireOutputDataChanged(outputs: OutputDescriptor[]): void;
    fireOpenOverviewOutputSignal(traceId: string): void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    firePinView(output: OutputDescriptor, payload?: any): void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fireUnPinView(output: OutputDescriptor, payload?: any): void;
    fireOverviewOutputSelectedSignal(payload: { traceId: string; outputDescriptor: OutputDescriptor }): void;
    fireSaveAsCsv(payload: { traceId: string; data: string }): void;
    fireSelectionRangeUpdated(payload: TimeRangeUpdatePayload): void;
    fireViewRangeUpdated(payload: TimeRangeUpdatePayload): void;
    fireRequestSelectionRangeChange(payload: TimeRangeUpdatePayload): void;
    fireContributeContextMenu(payload: ContextMenuContributedSignalPayload): void;
    fireContextMenuItemClicked(payload: ContextMenuItemClickedSignalPayload): void;
}

export const Signals = {
    TRACE_OPENED: 'trace opened',
    TRACE_DELETED: 'trace deleted',
    EXPERIMENT_OPENED: 'experiment opened',
    EXPERIMENT_CLOSED: 'experiment closed',
    EXPERIMENT_DELETED: 'experiment deleted',
    EXPERIMENT_SELECTED: 'experiment selected',
    EXPERIMENT_UPDATED: 'experiment updated',
    OPENED_TRACES_UPDATED: 'opened traces updated',
    AVAILABLE_OUTPUTS_CHANGED: 'available outputs changed',
    OUTPUT_ADDED: 'output added',
    ITEM_PROPERTIES_UPDATED: 'item properties updated',
    THEME_CHANGED: 'theme changed',
    SELECTION_CHANGED: 'selection changed',
    ROW_SELECTIONS_CHANGED: 'rows selected changed',
    CLOSE_TRACEVIEWERTAB: 'tab closed',
    TRACEVIEWERTAB_ACTIVATED: 'widget activated',
    UPDATE_ZOOM: 'update zoom',
    RESET_ZOOM: 'reset zoom',
    UNDO: 'undo',
    REDO: 'redo',
    MARKER_CATEGORIES_FETCHED: 'marker categories fetched',
    MARKERSETS_FETCHED: 'markersets fetched',
    MARKER_CATEGORY_CLOSED: 'marker category closed',
    TRACE_SERVER_STARTED: 'trace server started',
    PIN_VIEW: 'view pinned',
    UNPIN_VIEW: 'view unpinned',
    OPEN_OVERVIEW_OUTPUT: 'open overview output',
    OVERVIEW_OUTPUT_SELECTED: 'overview output selected',
    SAVE_AS_CSV: 'save as csv',
    VIEW_RANGE_UPDATED: 'view range updated',
    SELECTION_RANGE_UPDATED: 'selection range updated',
    REQUEST_SELECTION_RANGE_CHANGE: 'change selection range',
    OUTPUT_DATA_CHANGED: 'output data changed',
    CONTRIBUTE_CONTEXT_MENU: 'contribute context menu',
    CONTEXT_MENU_ITEM_CLICKED: 'context menu item clicked'
};

export class SignalManager extends EventEmitter implements SignalManager {
    fireTraceOpenedSignal(trace: Trace): void {
        this.emit(Signals.TRACE_OPENED, trace);
    }
    fireTraceDeletedSignal(trace: Trace): void {
        this.emit(Signals.TRACE_DELETED, { trace });
    }
    fireExperimentOpenedSignal(experiment: Experiment): void {
        this.emit(Signals.EXPERIMENT_OPENED, experiment);
    }
    fireExperimentClosedSignal(experiment: Experiment): void {
        this.emit(Signals.EXPERIMENT_CLOSED, experiment);
    }
    fireExperimentDeletedSignal(experiment: Experiment): void {
        this.emit(Signals.EXPERIMENT_DELETED, experiment);
    }
    fireExperimentSelectedSignal(experiment: Experiment | undefined): void {
        this.emit(Signals.EXPERIMENT_SELECTED, experiment);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fireRowSelectionsChanged(payload: RowSelectionsChangedSignalPayload): void {
        this.emit(Signals.ROW_SELECTIONS_CHANGED, payload);
    }
    fireExperimentUpdatedSignal(experiment: Experiment): void {
        this.emit(Signals.EXPERIMENT_UPDATED, experiment);
    }
    fireOpenedTracesChangedSignal(payload: OpenedTracesUpdatedSignalPayload): void {
        this.emit(Signals.OPENED_TRACES_UPDATED, payload);
    }
    fireOutputAddedSignal(payload: OutputAddedSignalPayload): void {
        this.emit(Signals.OUTPUT_ADDED, payload);
    }
    fireItemPropertiesSignalUpdated(payload: ItemPropertiesSignalPayload): void {
        this.emit(Signals.ITEM_PROPERTIES_UPDATED, payload);
    }
    fireThemeChangedSignal(theme: string): void {
        this.emit(Signals.THEME_CHANGED, theme);
    }
    fireSelectionChangedSignal(payload: { [key: string]: string }): void {
        this.emit(Signals.SELECTION_CHANGED, payload);
    }
    fireCloseTraceViewerTabSignal(traceUUID: string): void {
        this.emit(Signals.CLOSE_TRACEVIEWERTAB, traceUUID);
    }
    fireTraceViewerTabActivatedSignal(experiment: Experiment): void {
        this.emit(Signals.TRACEVIEWERTAB_ACTIVATED, experiment);
    }
    fireUpdateZoomSignal(hasZoomedIn: boolean): void {
        this.emit(Signals.UPDATE_ZOOM, hasZoomedIn);
    }
    fireResetZoomSignal(): void {
        this.emit(Signals.RESET_ZOOM);
    }
    fireMarkerCategoriesFetchedSignal(): void {
        this.emit(Signals.MARKER_CATEGORIES_FETCHED);
    }
    fireMarkerSetsFetchedSignal(): void {
        this.emit(Signals.MARKERSETS_FETCHED);
    }
    fireMarkerCategoryClosedSignal(payload: { traceViewerId: string; markerCategory: string }): void {
        this.emit(Signals.MARKER_CATEGORY_CLOSED, payload);
    }
    fireTraceServerStartedSignal(): void {
        this.emit(Signals.TRACE_SERVER_STARTED);
    }
    fireUndoSignal(): void {
        this.emit(Signals.UNDO);
    }
    fireRedoSignal(): void {
        this.emit(Signals.REDO);
    }
    fireOutputDataChanged(outputs: OutputDescriptor[]): void {
        this.emit(Signals.OUTPUT_DATA_CHANGED, outputs);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-module-boundary-types
    firePinView(output: OutputDescriptor, payload?: any): void {
        this.emit(Signals.PIN_VIEW, output, payload);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-module-boundary-types
    fireUnPinView(output: OutputDescriptor, payload?: any): void {
        this.emit(Signals.UNPIN_VIEW, output, payload);
    }
    fireOpenOverviewOutputSignal(traceId: string): void {
        this.emit(Signals.OPEN_OVERVIEW_OUTPUT, traceId);
    }
    fireOverviewOutputSelectedSignal(payload: { traceId: string; outputDescriptor: OutputDescriptor }): void {
        this.emit(Signals.OVERVIEW_OUTPUT_SELECTED, payload);
    }
    fireSaveAsCsv(payload: { traceId: string; data: string }): void {
        this.emit(Signals.SAVE_AS_CSV, payload);
    }
    fireViewRangeUpdated(payload: TimeRangeUpdatePayload): void {
        this.emit(Signals.VIEW_RANGE_UPDATED, payload);
    }
    fireSelectionRangeUpdated(payload: TimeRangeUpdatePayload): void {
        this.emit(Signals.SELECTION_RANGE_UPDATED, payload);
    }
    fireRequestSelectionRangeChange(payload: TimeRangeUpdatePayload): void {
        this.emit(Signals.REQUEST_SELECTION_RANGE_CHANGE, payload);
    }
    fireContributeContextMenu(payload: ContextMenuContributedSignalPayload): void {
        this.emit(Signals.CONTRIBUTE_CONTEXT_MENU, payload);
    }
    fireContextMenuItemClicked(payload: ContextMenuItemClickedSignalPayload): void {
        this.emit(Signals.CONTEXT_MENU_ITEM_CLICKED, payload);
    }
}

let instance: SignalManager = new SignalManager();

export const setSignalManagerInstance = (sm: SignalManager): void => {
    instance = sm;
};

export const signalManager = (): SignalManager => instance;
