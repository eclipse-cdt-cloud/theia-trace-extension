import { EventEmitter } from 'events';
import { Experiment } from 'tsp-typescript-client/lib/models/experiment';

export declare interface SignalManager {

    fireTooltipSignal(tooltip?: { [key: string]: string }): void;
    fireThemeChangedSignal(theme: string): void;
    fireSelectionChangedSignal(payload: { [key: string]: string }): void;
    fireCloseTraceViewerTabSignal(traceUUID: string): void;
    fireExperimentSelectedSignal(experiment: Experiment | undefined): void;

}

export const Signals = {
    TRACE_OPENED: 'trace opened',
    TRACE_CLOSED: 'trace closed',
    EXPERIMENT_OPENED: 'experiment opened',
    EXPERIMENT_CLOSED: 'experiment closed',
    EXPERIMENT_SELECTED: 'experiment selected',
    TOOLTIP_UPDATED: 'tooltip updated',
    THEME_CHANGED: 'theme changed',
    SELECTION_CHANGED: 'selection changed',
    TRACEVIEWER_CLOSED: 'tab closed'
};

export class SignalManager extends EventEmitter implements SignalManager {

    fireTooltipSignal(tooltip?: { [key: string]: string; }): void {
        this.emit(Signals.TOOLTIP_UPDATED, { tooltip });
    }

    fireThemeChangedSignal(theme: string): void {
        this.emit(Signals.THEME_CHANGED, theme);
    }

    fireSelectionChangedSignal(payload: { [key: string]: string; }): void {
        this.emit(Signals.SELECTION_CHANGED, { payload });
    }

    fireCloseTraceViewerTabSignal(traceUUID: string): void {
        this.emit(Signals.TRACEVIEWER_CLOSED, traceUUID);
    }

    fireExperimentSelectedSignal(experiment: Experiment | undefined): void {
        this.emit(Signals.EXPERIMENT_SELECTED, experiment);
    }

}

let instance: SignalManager = new SignalManager();

export const setSignalManagerInstance = (sm: SignalManager): void => {
    instance = sm;
};

export const signalManager = (): SignalManager => instance;
