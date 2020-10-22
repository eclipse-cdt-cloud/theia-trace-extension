import { TspClient } from 'tsp-typescript-client/lib/protocol/tsp-client';
import { TimeGraphEntry, TimeGraphRow, TimeGraphState } from 'tsp-typescript-client/lib/models/timegraph';
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
        if (!this.timeGraphEntries.length) {
            return {
                id: 'model',
                totalLength: this.totalRange,
                arrows: [],
                rows: [],
                data: {}
            };
        }

        this.totalRange = this.timeGraphEntries[0].end - this.timeGraphEntries[0].start; // 1332170682540133097 - starttime
        let statesParameters = QueryHelper.selectionTimeQuery(QueryHelper.splitRangeIntoEqualParts(1332170682440133097, 1332170682540133097, 1120), ids);
        if (viewRange && resolution) {
            const start = viewRange.start + this.timeGraphEntries[0].start;
            const end = viewRange.end + this.timeGraphEntries[0].start;
            statesParameters = QueryHelper.selectionTimeQuery(QueryHelper.splitRangeIntoEqualParts(Math.trunc(start), Math.trunc(end), resolution), ids);
        }
        const stateResponse = (await this.client.fetchTimeGraphStates(this.traceUUID,
            this.outputId, statesParameters)).getModel();

        this.timeGraphRows = stateResponse.model.rows;
        this.timeGraphRowsOrdering(ids);

        // the start time which is normalized to logical 0 in timeline chart.
        const chartStart = this.timeGraphEntries[0].start;
        const rows: TimelineChart.TimeGraphRowModel[] = [];
        this.timeGraphRows.forEach((row: TimeGraphRow) => {
            const rowId: number = row.entryId;
            const entry = this.timeGraphEntries.find(tgEntry => tgEntry.id === rowId);
            if (entry) {
                const states = this.getStateModelByRow(row, chartStart);
                rows.push({
                    id: rowId,
                    name: entry.labels[0], // 'row' + rowId,
                    range: {
                        start: entry.start - chartStart,
                        end: entry.end - chartStart
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
            const timeGraphRow = this.timeGraphRows.find(row => row.entryId === id);
            if (timeGraphRow) {
                newTimeGraphRows.push(timeGraphRow);
            } else {
                const emptyRow: TimeGraphRow = {states: [{start: 0, end: 0, label: '', tags: 0}], entryId: id};
                newTimeGraphRows.push(emptyRow);
            }
        });

        this.timeGraphRows = newTimeGraphRows;
    }

    protected getStateModelByRow(row: TimeGraphRow, chartStart: number): TimelineChart.TimeGraphRowElementModel[] {
        const states: TimelineChart.TimeGraphRowElementModel[] = [];
        row.states.forEach((state: TimeGraphState, idx: number) => {
            const end = state.end - chartStart;
            if (state.style) {
                states.push({
                    id: row.entryId + '-' + idx,
                    label: state.label || '',
                    range: {
                        start: state.start - chartStart,
                        end
                    },
                    data: {
                        style: state.style
                    }
                });
                this.totalRange = this.totalRange < end ? end : this.totalRange;
            } else {
                const nextIndex = idx + 1;
                const nextState = row.states[nextIndex];
                if (nextState && nextState.start > state.end + 1) {
                    // Add gap state
                    states.push({
                        id: row.entryId + '-' + idx,
                        label: 'GAP',
                        range: {
                            start: end,
                            end: nextState.start - chartStart
                        },
                        data: {

                        }
                    });
                }
            }
        });
        return states;
    }
}
