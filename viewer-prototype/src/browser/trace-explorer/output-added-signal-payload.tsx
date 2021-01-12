import { OutputDescriptor } from 'tsp-typescript-client/lib/models/output-descriptor';
import { Experiment } from 'tsp-typescript-client/lib/models/experiment';

export class OutputAddedSignalPayload {
    private outputDescriptor: OutputDescriptor;
    private experiment: Experiment;

    constructor(outputDescriptor: OutputDescriptor, trace: Experiment) {
        this.outputDescriptor = outputDescriptor;
        this.experiment = trace;
    }

    public getOutputDescriptor(): OutputDescriptor {
        return this.outputDescriptor;
    }

    public getExperiment(): Experiment {
        return this.experiment;
    }
}
