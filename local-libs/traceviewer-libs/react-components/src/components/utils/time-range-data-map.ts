import { TimeRangeUpdatePayload } from 'traceviewer-base/lib/signals/time-range-data-signal-payloads';
import { ExperimentTimeRangeData } from '../../trace-explorer/trace-explorer-time-range-data-widget';
import { Experiment } from 'tsp-typescript-client/lib/models/experiment';

export class TimeRangeDataMap {
    private _experimentDataMap: Map<string, ExperimentTimeRangeData>;
    private _activeData?: ExperimentTimeRangeData;
    constructor() {
        this._experimentDataMap = new Map<string, ExperimentTimeRangeData>();
    }

    public updateViewRange = (payload: TimeRangeUpdatePayload): void => {
        const { experimentUUID: UUID, timeRange } = payload;

        const update = {
            UUID,
            viewRange: timeRange
        } as ExperimentTimeRangeData;

        this.updateExperimentTimeRangeData(update);
    };

    public updateSelectionRange = (payload: TimeRangeUpdatePayload): void => {
        const { experimentUUID: UUID, timeRange } = payload;

        const update = {
            UUID,
            selectionRange: timeRange
        } as ExperimentTimeRangeData;

        this.updateExperimentTimeRangeData(update);
    };

    public updateAbsoluteRange = (experiment: Experiment): void => {
        if (!experiment) {
            return;
        }

        const { UUID, start, end } = experiment;

        const update = {
            UUID,
            absoluteRange: {
                start,
                end
            }
        } as ExperimentTimeRangeData;

        this.updateExperimentTimeRangeData(update);
    };

    /**
     * Updates the data stored in experimentDataMap.  Works similar to setState() where
     * you only input the data to change and the existing values persist.
     * @param data Partial data of Experiment Time Range Data.
     */
    private updateExperimentTimeRangeData = (data: ExperimentTimeRangeData): void => {
        const map = this._experimentDataMap;
        const id = data.UUID;
        const existingData = map.get(id) || {};
        const newData = {
            ...existingData,
            ...data
        };
        map.set(id, newData);

        // If the experiment is currently displayed, we need to render it
        if (id === this._activeData?.UUID) {
            this.setActiveExperiment(newData);
        }
    };

    public setActiveExperiment(data?: ExperimentTimeRangeData): void {
        this._activeData = data;
    }

    public delete = (experiment: Experiment | string): void => {
        const id = typeof experiment === 'string' ? experiment : experiment.UUID;
        this._experimentDataMap.delete(id);
    };

    public get(UUID: string): ExperimentTimeRangeData | undefined {
        return this._experimentDataMap.get(UUID);
    }

    public set(data: ExperimentTimeRangeData): void {
        this._experimentDataMap.set(data.UUID, data);
    }

    public clear(): void {
        this._experimentDataMap.clear();
    }

    get activeData(): ExperimentTimeRangeData | undefined {
        return this._activeData;
    }

    get experimentDataMap(): Map<string, ExperimentTimeRangeData> {
        return this._experimentDataMap;
    }
}
