import { EventEmitter } from 'events';
import { Experiment } from 'tsp-typescript-client/lib/models/experiment';
import { Trace } from 'tsp-typescript-client/lib/models/trace';
import { AvailableAnalysesChangedSignalPayload } from './available-analyses-changed-signal-payload';
import { OutputAddedSignalPayload } from './output-added-signal-payload';

export declare interface SignalManager {
    fireTraceOpenedSignal(trace: Trace): void;
    fireTraceClosedSignal(trace: Trace): void;
    fireExperimentExperimentSignal(experiment: Experiment): void;
    fireExperimentClosedSignal(experiment: Experiment): void;
    fireExperimentSelectedSignal(experiment: Experiment): void;
    fireOpenedTracesChangedSignal(): void;
    fireAvailableOutputsChangedSignal(payload: AvailableAnalysesChangedSignalPayload): void;
    fireOutputAddedSignal(payload: OutputAddedSignalPayload): void;
    fireTooltipSignal(tooltip?: { [key: string]: string }): void;
    fireThemeChangedSignal(theme: string): void;
    fireSelectionChangedSignal(payload: { [key: string]: string }): void;
    fireCloseTraceViewerTabSignal(traceUUID: string): void;
    fireTraceViewerTabActivatedSignal(experiment: Experiment): void;
}

export const Signals = {
    TRACE_OPENED: 'trace opened',
    TRACE_CLOSED: 'trace closed',
    EXPERIMENT_OPENED: 'experiment opened',
    EXPERIMENT_CLOSED: 'experiment closed',
    EXPERIMENT_SELECTED: 'experiment selected',
    OPENED_TRACES_UPDATED: 'opened traces updated',
    AVAILABLE_OUTPUTS_CHANGED: 'available outputs changed',
    OUTPUT_ADDED: 'output added',
    TOOLTIP_UPDATED: 'tooltip updated',
    THEME_CHANGED: 'theme changed',
    SELECTION_CHANGED: 'selection changed',
    CLOSE_TRACEVIEWERTAB: 'tab closed',
    TRACEVIEWERTAB_ACTIVATED: 'widget activated'
};

export class SignalManager extends EventEmitter implements SignalManager {
    fireTraceOpenedSignal(trace: Trace): void {
        this.emit(Signals.TRACE_OPENED, trace);
    }
    fireTraceClosedSignal(trace: Trace): void {
        this.emit(Signals.TRACE_CLOSED, { trace });
    }
    fireExperimentOpenedSignal(experiment: Experiment): void {
        this.emit(Signals.EXPERIMENT_OPENED, experiment);
    }
    fireExperimentClosedSignal(experiment: Experiment): void {
        this.emit(Signals.EXPERIMENT_CLOSED, experiment);
    }
    fireExperimentSelectedSignal(experiment: Experiment): void {
        this.emit(Signals.EXPERIMENT_SELECTED, experiment);
    }
    fireOpenedTracesChangedSignal(): void {
        this.emit(Signals.OPENED_TRACES_UPDATED);
    }
    fireAvailableOutputsChangedSignal(payload: AvailableAnalysesChangedSignalPayload): void {
        this.emit(Signals.AVAILABLE_OUTPUTS_CHANGED, payload);
    }
    fireOutputAddedSignal(payload: OutputAddedSignalPayload): void {
        this.emit(Signals.OUTPUT_ADDED, payload);
    }
    fireTooltipSignal(tooltip?: { [key: string]: string; }): void {
        this.emit(Signals.TOOLTIP_UPDATED, tooltip );
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
}

let instance: SignalManager = new SignalManager();

export const setSignalManagerInstance = (sm: SignalManager): void => {
    instance = sm;
};

export const signalManager = (): SignalManager => instance;
