import { OutputDescriptor } from 'tsp-typescript-client/lib/models/output-descriptor';
import { Experiment } from 'tsp-typescript-client/lib/models/experiment';

export class AvailableAnalysesChangedSignalPayload {
    private _availableOutputDescriptors: OutputDescriptor[];
    private _experiment: Experiment;

    constructor(availableOutputDescriptors: OutputDescriptor[], experiment: Experiment) {
        this._availableOutputDescriptors = availableOutputDescriptors;
        this._experiment = experiment;
    }

    public getAvailableOutputDescriptors(): OutputDescriptor[] {
        return this._availableOutputDescriptors;
    }

    public getExperiment(): Experiment {
        return this._experiment;
    }
}
