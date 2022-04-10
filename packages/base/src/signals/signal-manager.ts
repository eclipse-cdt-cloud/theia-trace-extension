import { EventEmitter } from 'events';
import { Experiment } from 'tsp-typescript-client/lib/models/experiment';
import { Trace } from 'tsp-typescript-client/lib/models/trace';
import { OpenedTracesUpdatedSignalPayload } from './opened-traces-updated-signal-payload';
import { OutputAddedSignalPayload } from './output-added-signal-payload';
export declare interface SignalManager {
    fireTraceOpenedSignal(trace: Trace): void;
    fireTraceDeletedSignal(trace: Trace): void;
    fireExperimentExperimentSignal(experiment: Experiment): void;
    fireExperimentClosedSignal(experiment: Experiment): void;
    fireExperimentDeletedSignal(experiment: Experiment): void;
    fireExperimentSelectedSignal(experiment: Experiment | undefined): void;
    fireOpenedTracesChangedSignal(payload: OpenedTracesUpdatedSignalPayload): void;
    fireOutputAddedSignal(payload: OutputAddedSignalPayload): void;
    fireTooltipSignal(tooltip?: { [key: string]: string }): void;
    fireThemeChangedSignal(theme: string): void;
    fireSelectionChangedSignal(payload: { [key: string]: string }): void;
    fireCloseTraceViewerTabSignal(traceUUID: string): void;
    fireTraceViewerTabActivatedSignal(experiment: Experiment): void;
    fireUpdateZoomSignal(hasZoomedIn: boolean): void;
    fireResetZoomSignal(): void;
    fireMarkerCategoriesFetchedSignal(): void;
    fireMarkerSetsFetchedSignal(): void;
    fireMarkerCategoryClosedSignal(payload: { traceViewerId: string, markerCategory: string }): void;
    fireTraceServerStartedSignal(): void;
    fireUndoSignal(): void;
    fireRedoSignal(): void;
}

export const Signals = {
    TRACE_OPENED: 'trace opened',
    TRACE_DELETED: 'trace deleted',
    EXPERIMENT_OPENED: 'experiment opened',
    EXPERIMENT_CLOSED: 'experiment closed',
    EXPERIMENT_DELETED: 'experiment deleted',
    EXPERIMENT_SELECTED: 'experiment selected',
    OPENED_TRACES_UPDATED: 'opened traces updated',
    AVAILABLE_OUTPUTS_CHANGED: 'available outputs changed',
    OUTPUT_ADDED: 'output added',
    TOOLTIP_UPDATED: 'tooltip updated',
    THEME_CHANGED: 'theme changed',
    SELECTION_CHANGED: 'selection changed',
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
    fireOpenedTracesChangedSignal(payload: OpenedTracesUpdatedSignalPayload): void {
        this.emit(Signals.OPENED_TRACES_UPDATED, payload);
    }
    fireOutputAddedSignal(payload: OutputAddedSignalPayload): void {
        this.emit(Signals.OUTPUT_ADDED, payload);
    }
    fireTooltipSignal(tooltip?: { [key: string]: string; }): void {
        this.emit(Signals.TOOLTIP_UPDATED, tooltip);
    }
    fireThemeChangedSignal(theme: string): void {
        this.emit(Signals.THEME_CHANGED, theme);
    }
    fireSelectionChangedSignal(payload: { [key: string]: string; }): void {
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
    fireMarkerCategoryClosedSignal(payload: { traceViewerId: string, markerCategory: string }): void {
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
}

let instance: SignalManager = new SignalManager();

export const setSignalManagerInstance = (sm: SignalManager): void => {
    instance = sm;
};

export const signalManager = (): SignalManager => instance;
