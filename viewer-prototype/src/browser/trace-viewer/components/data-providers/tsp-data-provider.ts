import { TspClient } from "tsp-typescript-client/lib/protocol/tsp-client";
import { TimeGraphEntry, TimeGraphRow, TimeGraphModel, TimeGraphState } from "tsp-typescript-client/lib/models/timegraph";
import { TimelineChart } from "timeline-chart/lib/time-graph-model";
import { QueryHelper } from "tsp-typescript-client/lib/models/query/query-helper";
import { EntryHeader } from "tsp-typescript-client/lib/models/entry";

export class TspDataProvider {

    protected canvasDisplayWidth: number | undefined;

    private client: TspClient;
    private outputId: string;
    private traceUUID: string;
    private timeGraphEntries: TimeGraphEntry[];
    private timeGraphRows: TimeGraphRow[];

    public totalRange: number;

    constructor(client: TspClient, traceUUID: string, outputId: string, canvasDisplayWidth?: number) {
        this.timeGraphEntries = new Array();
        this.timeGraphRows = new Array();
        this.canvasDisplayWidth = canvasDisplayWidth;
        this.client = client;
        this.outputId = outputId;
        this.traceUUID = traceUUID;
        this.totalRange = 0;
    }

    async getData(viewRange?: TimelineChart.TimeGraphRange, resolution?: number): Promise<TimelineChart.TimeGraphModel> {
        const resourcesTreeParameters = QueryHelper.timeQuery([0, 1]); // QueryHelper.timeQuery(QueryHelper.splitRangeIntoEqualParts(1332170682440133097, 1332170682540133097, 1120));
        const treeResponse = (await this.client.fetchTimeGraphTree<TimeGraphEntry, EntryHeader>(
            this.traceUUID,
            this.outputId,
            resourcesTreeParameters)).getModel();
        this.timeGraphEntries = treeResponse.model.entries;
        this.totalRange = this.timeGraphEntries[0].endTime - this.timeGraphEntries[0].startTime; // 1332170682540133097 - starttime
        const selectedItems = new Array<number>();
        this.timeGraphEntries.forEach(timeGraphEntry => {
            selectedItems.push(timeGraphEntry.id);
        });

        let statesParameters = QueryHelper.selectionTimeQuery(QueryHelper.splitRangeIntoEqualParts(1332170682440133097, 1332170682540133097, 1120), selectedItems);
        if (viewRange && resolution) {
            const start = viewRange.start + this.timeGraphEntries[0].startTime;
            const end = viewRange.end + this.timeGraphEntries[0].startTime;
            statesParameters = QueryHelper.selectionTimeQuery(QueryHelper.splitRangeIntoEqualParts(Math.trunc(start), Math.trunc(end), resolution), selectedItems);
        }
        const stateResponse = (await this.client.fetchTimeGraphStates<TimeGraphModel>(this.traceUUID,
            this.outputId, statesParameters)).getModel();

        this.timeGraphRows = stateResponse.model.rows;
        this.timeGraphRowsOrdering();


        // the start time which is normalized to logical 0 in timeline chart.
        const chartStart = this.timeGraphEntries[0].startTime;

        const rows: TimelineChart.TimeGraphRowModel[] = [];
        this.timeGraphRows.forEach((row: TimeGraphRow) => {
            const rowId: number = (row as any).entryID;
            const entry = this.timeGraphEntries.find(entry => entry.id === rowId);
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
        })

        return {
            id: 'model',
            totalLength: this.totalRange,
            arrows: [],
            rows,
            data: {
                originalStart: chartStart
            }
        }
    }

    private timeGraphRowsOrdering() {
        const newTimeGraphRows: TimeGraphRow[] = new Array();
        this.timeGraphEntries.forEach(entry => {
            const timeGraphRow = this.timeGraphRows.find(row => (row as any).entryID === entry.id);
            if (timeGraphRow) {
                newTimeGraphRows.push(timeGraphRow);
            }
        });

        this.timeGraphRows = newTimeGraphRows;
    }

    protected getStateModelByRow(row: TimeGraphRow, chartStart: number) {
        const states: TimelineChart.TimeGraphRowElementModel[] = [];
        row.states.forEach((state: TimeGraphState, idx: number) => {
            const end = state.startTime + state.duration - chartStart
            if (state.style || state.value >= 0) {
                states.push({
                    id: (row as any).entryID + "-" + idx,
                    label: state.label,
                    range: {
                        start: state.startTime - chartStart,
                        end
                    },
                    data: {
                        stateValue: state.value,
                        style: state.style
                    }
                })
                this.totalRange = this.totalRange < end ? end : this.totalRange;
            } else {
                const nextIndex = idx + 1;
                const nextState = row.states[nextIndex]
                if (nextState && nextState.value < 0) {
                    // Add gap state
                    states.push({
                        id: (row as any).entryID + "-" + idx,
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
