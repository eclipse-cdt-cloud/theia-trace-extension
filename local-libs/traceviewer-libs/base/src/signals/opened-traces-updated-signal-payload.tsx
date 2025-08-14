export class OpenedTracesUpdatedSignalPayload {
    private _numberOfOpenedTraces: number;

    constructor(numberOfOpenedTraces: number) {
        this._numberOfOpenedTraces = numberOfOpenedTraces;
    }

    public getNumberOfOpenedTraces(): number {
        return this._numberOfOpenedTraces;
    }
}
