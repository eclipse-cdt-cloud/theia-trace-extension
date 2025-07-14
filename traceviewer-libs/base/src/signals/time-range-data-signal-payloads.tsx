import { TimeRange } from '../utils/time-range';

export interface TimeRangeUpdatePayload {
    experimentUUID: string;
    timeRange?: TimeRange;
}
