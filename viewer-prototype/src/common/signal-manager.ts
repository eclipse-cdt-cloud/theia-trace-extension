import { Emitter } from '@theia/core';

export class SignalManager {
    private static instance: SignalManager | undefined;

    // TODO only temporary
    private tooltipEmitter = new Emitter<{ [key: string]: string }>();
    public tooltipSignal = this.tooltipEmitter.event;

    private constructor() {
        // nothing to do
    }

    public static getInstance(): SignalManager {
        if (!this.instance) {
            this.instance = new SignalManager();
        }
        return this.instance;
    }

    public fireTooltipSignal(payload: { [key: string]: string }) {
        this.tooltipEmitter.fire(payload);
    }
}