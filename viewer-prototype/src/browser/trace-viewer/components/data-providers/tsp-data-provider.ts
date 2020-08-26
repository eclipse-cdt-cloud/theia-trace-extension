/* eslint-disable @typescript-eslint/no-explicit-any */
import { TspClient } from 'tsp-typescript-client/lib/protocol/tsp-client';
import { TimeGraphEntry, TimeGraphRow, TimeGraphModel, TimeGraphState } from 'tsp-typescript-client/lib/models/timegraph';
import { TimelineChart } from 'timeline-chart/lib/time-graph-model';
import { QueryHelper } from 'tsp-typescript-client/lib/models/query/query-helper';

export class TspDataProvider {

    protected canvasDisplayWidth: number | undefined;

    private client: TspClient;
    private outputId: string;
    private traceUUID: string;
    private timeGraphEntries: TimeGraphEntry[];
    private timeGraphRows: TimeGraphRow[];

    public totalRange: number;

    constructor(client: TspClient, traceUUID: string, outputId: string, canvasDisplayWidth?: number) {
        this.timeGraphEntries = [];
        this.timeGraphRows = [];
        this.canvasDisplayWidth = canvasDisplayWidth;
        this.client = client;
        this.outputId = outputId;
        this.traceUUID = traceUUID;
        this.totalRange = 0;
    }

    async getData(ids: number[], entries: TimeGraphEntry[], viewRange?: TimelineChart.TimeGraphRange, resolution?: number): Promise<TimelineChart.TimeGraphModel> {
        this.timeGraphEntries = [...entries];
        this.totalRange = this.timeGraphEntries[0].endTime - this.timeGraphEntries[0].startTime; // 1332170682540133097 - starttime
        let statesParameters = QueryHelper.selectionTimeQuery(QueryHelper.splitRangeIntoEqualParts(1332170682440133097, 1332170682540133097, 1120), ids);
        if (viewRange && resolution) {
            const start = viewRange.start + this.timeGraphEntries[0].startTime;
            const end = viewRange.end + this.timeGraphEntries[0].startTime;
            statesParameters = QueryHelper.selectionTimeQuery(QueryHelper.splitRangeIntoEqualParts(Math.trunc(start), Math.trunc(end), resolution), ids);
        }
        const stateResponse = (await this.client.fetchTimeGraphStates<TimeGraphModel>(this.traceUUID,
            this.outputId, statesParameters)).getModel();

        this.timeGraphRows = stateResponse.model.rows;
        this.timeGraphRowsOrdering(ids);

        // the start time which is normalized to logical 0 in timeline chart.
        const chartStart = this.timeGraphEntries[0].startTime;

        const rows: TimelineChart.TimeGraphRowModel[] = [];
        this.timeGraphRows.forEach((row: TimeGraphRow) => {
            const rowId: number = (row as any).entryID;
            const entry = this.timeGraphEntries.find(tgEntry => tgEntry.id === rowId);
            if (entry) {
                const states = this.getStateModelByRow(row, chartStart);
                rows.push({
                    id: rowId,
                    name: entry.labels[0], // 'row' + rowId,
                    range: {
                        start: entry.startTime - chartStart,
                        end: entry.endTime - chartStart
                    },
                    states
                });
            }
        });

        return {
            id: 'model',
            totalLength: this.totalRange,
            arrows: [],
            rows,
            data: {
                originalStart: chartStart
            }
        };
    }

    private timeGraphRowsOrdering(orderedIds: number[]) {
        const newTimeGraphRows: TimeGraphRow[] = [];
        orderedIds.forEach(id => {
            const timeGraphRow = this.timeGraphRows.find(row => (row as any).entryID === id);
            if (timeGraphRow) {
                newTimeGraphRows.push(timeGraphRow);
            } else {
                const emptyRow: any = {states: [{value: 0, startTime: 0, duration: 0, label: '', tags: 0}], entryID: id};
                newTimeGraphRows.push(emptyRow);
            }
        });

        this.timeGraphRows = newTimeGraphRows;
    }

    protected getStateModelByRow(row: TimeGraphRow, chartStart: number): TimelineChart.TimeGraphRowElementModel[] {
        const states: TimelineChart.TimeGraphRowElementModel[] = [];
        row.states.forEach((state: TimeGraphState, idx: number) => {
            const end = state.startTime + state.duration - chartStart;
            if (state.style || state.value >= 0) {
                states.push({
                    id: (row as any).entryID + '-' + idx,
                    label: state.label,
                    range: {
                        start: state.startTime - chartStart,
                        end
                    },
                    data: {
                        stateValue: state.value,
                        style: state.style
                    }
                });
                this.totalRange = this.totalRange < end ? end : this.totalRange;
            } else {
                const nextIndex = idx + 1;
                const nextState = row.states[nextIndex];
                if (nextState && nextState.value < 0) {
                    // Add gap state
                    states.push({
                        id: (row as any).entryID + '-' + idx,
                        label: 'GAP',
                        range: {
                            start: end,
                            end: nextState.startTime - chartStart
                        },
                        data: {
                            stateValue: -1
                        }
                    });
                }
            }
        });
        return states;
    }
}
