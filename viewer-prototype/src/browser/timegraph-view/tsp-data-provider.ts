import { TspClient } from "tsp-typescript-client/lib/protocol/tsp-client";
import { TimeGraphEntry, TimeGraphRow, TimeGraphModel } from "tsp-typescript-client/lib/models/timegraph";
import { TimelineChart } from "timeline-chart/lib/time-graph-model";
import { QueryHelper } from "tsp-typescript-client/lib/models/query/query-helper";
import { EntryHeader } from "tsp-typescript-client/lib/models/entry";
import { Trace } from "tsp-typescript-client/lib/models/trace";

export class TspDataProvider {

    protected canvasDisplayWidth: number | undefined;

    private client: TspClient;
    private outputId: string;
    private traceUUID: string | undefined;
    private timeGraphEntries: TimeGraphEntry[];
    private timeGraphRows: TimeGraphRow[];

    public totalRange: number;

    constructor(client: TspClient, outputId: string, canvasDisplayWidth?: number) {
        this.timeGraphEntries = new Array();
        this.timeGraphRows = new Array();
        this.canvasDisplayWidth = canvasDisplayWidth;
        this.client = client;
        this.outputId = outputId;
        // this.traceUUID = traceUUID;
        this.totalRange = 0;
        this.initializeTrace();
    }

    async initializeTrace() {
        const traces: Trace[] = await this.client.fetchTraces();
        if(traces && traces.length) {
            this.traceUUID = traces[0].UUID;
        }
    }

    async getData(viewRange?: TimelineChart.TimeGraphRange, resolution?: number): Promise<TimelineChart.TimeGraphModel> {
        if(!this.traceUUID) {
            return {
                id: 'model',
                totalLength: this.totalRange,
                arrows: [],
                rows: []
            }
        }
        const resourcesTreeParameters = QueryHelper.timeQuery([0, 1]); // QueryHelper.timeQuery(QueryHelper.splitRangeIntoEqualParts(1332170682440133097, 1332170682540133097, 1120));
        const treeResponse = await this.client.fetchTimeGraphTree<TimeGraphEntry, EntryHeader>(
            this.traceUUID,
            this.outputId,
            resourcesTreeParameters);
        this.timeGraphEntries = treeResponse.model.entries;
        this.totalRange = this.timeGraphEntries[0].endTime - this.timeGraphEntries[0].startTime; // 1332170682540133097 - starttime
        const selectedItems = new Array<number>();
        this.timeGraphEntries.forEach(timeGraphEntry => {
            selectedItems.push(timeGraphEntry.id);
        });
        // let startRange: number = this.timeGraphEntries[0].startTime;
        // let endRange: number = startRange + this.totalRange;
        // if (viewRange) {
        //     startRange = viewRange.start;
        //     endRange = viewRange.end;
        // }
        // const resolution: number = 1000; // viewRange ? this.canvasDisplayWidth / (viewRange.end - viewRange.start) : this.canvasDisplayWidth / this.totalRange;
        
        // TODO: This should be something like that QueryHelper.splitRangeIntoEqualParts(viewRange.start, viewRange.end, resolution)
        // const statesParameters = QueryHelper.selectionTimeQuery(QueryHelper.splitRangeIntoEqualParts(1332170682440133097, 1332170682540133097, 1000), selectedItems); // QueryHelper.selectionTimeQuery(QueryHelper.splitRangeIntoEqualParts(startRange, endRange, resolution), selectedItems);
        let statesParameters = QueryHelper.selectionTimeQuery(QueryHelper.splitRangeIntoEqualParts(1332170682440133097, 1332170682540133097, 1120), selectedItems);
        if(viewRange && resolution) {
            const start = viewRange.start + this.timeGraphEntries[0].startTime;
            const end = viewRange.end + this.timeGraphEntries[0].startTime;
            statesParameters = QueryHelper.selectionTimeQuery(QueryHelper.splitRangeIntoEqualParts(Math.trunc(start), Math.trunc(end), 1120), selectedItems);
        }
        const stateResponse = await this.client.fetchTimeGraphStates<TimeGraphModel>(this.traceUUID,
            this.outputId, statesParameters);

        this.timeGraphRows = stateResponse.model.rows;

        // the start time which is normalized to logical 0 in timeline chart.
        const chartStart = this.timeGraphEntries[0].startTime;
        
        const rows: TimelineChart.TimeGraphRowModel[] = [];
        this.timeGraphRows.forEach((row:TimeGraphRow) => {
            const rowId: number = (row as any).entryID;
            const entry = this.timeGraphEntries.find(entry => entry.id === rowId);
            if(entry){
                // const states = this.getStateModelByRow(row);
                const states = this.getStateModelByRow(row, chartStart);
                rows.push({
                    id: rowId,
                    name: 'row' + rowId,
                    range: {
                        start: entry.startTime - chartStart,
                        end: entry.endTime - chartStart
                        // start: entry.startTime,
                        // end: entry.endTime
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

    protected getStateModelByRow(row:TimeGraphRow, chartStart: number){
        const states: TimelineChart.TimeGraphRowElementModel[] = [];
        row.states.forEach((state:any, idx:number)=>{
            // had to use type 'any' for state because there is a difference between TimegraphState from server and in model of tsp-typescript-client
            // state has no endTime but duration
            const end = state.startTime + state.duration - chartStart
            if(state.value > 0){
                states.push({
                    id: (row as any).entryID + "-" + idx,
                    label: state.label,
                    range: {
                        start: state.startTime - chartStart,
                        end
                    },
                    data: {
                        stateValue: state.value
                    }
                })
                this.totalRange = this.totalRange < end ? end : this.totalRange;
            }
        });
        // row.states.forEach((state:TimeGraphState, idx:number)=>{
        //     states.push({
        //         id: (row as any).entryID + "-" + idx,
        //         label: state.label,
        //         range: {
        //             start: state.startTime,
        //             end: state.endTime
        //         }
        //     })
        // })
        return states;
    }
}
