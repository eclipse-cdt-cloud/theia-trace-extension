import { EventEmitter } from 'events';

export declare interface SignalManager {

    fireTooltipSignal(payload: { [key: string]: string }): void;
    
}

export const Signals = {
    TRACE_OPENED : "trace opened",
    TRACE_CLOSED : "trace closed",
    EXPERIMENT_OPENED: "experiment opened",
    EXPERIMENT_CLOSED: "experiment closed"
}

export class SignalManager extends EventEmitter implements SignalManager {

    fireTooltipSignal(payload: { [key: string]: string; }): void {
        console.log("tooltip signal was fired");
    }

}

let instance: SignalManager = new SignalManager();

export const setSignalManagerInstance = (sm: SignalManager) => {
    instance = sm;
}

export const signalManager = (): SignalManager => {
    return instance;
}
