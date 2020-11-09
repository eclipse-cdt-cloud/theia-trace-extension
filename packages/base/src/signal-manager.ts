import { EventEmitter } from 'events';

export declare interface SignalManager {

    fireTooltipSignal(tooltip: { [key: string]: string }): void;

}

export const Signals = {
    TRACE_OPENED : 'trace opened',
    TRACE_CLOSED : 'trace closed',
    EXPERIMENT_OPENED: 'experiment opened',
    EXPERIMENT_CLOSED: 'experiment closed',
    EXPERIMENT_SELECTED: 'experiment selected',
    TOOLTIP_UPDATED: 'tooltip updated'
};

export class SignalManager extends EventEmitter implements SignalManager {

    fireTooltipSignal(tooltip: { [key: string]: string; }): void {
        this.emit(Signals.TOOLTIP_UPDATED, {tooltip});
    }

}

let instance: SignalManager = new SignalManager();

export const setSignalManagerInstance = (sm: SignalManager) => {
    instance = sm;
};

export const signalManager = (): SignalManager => instance;
