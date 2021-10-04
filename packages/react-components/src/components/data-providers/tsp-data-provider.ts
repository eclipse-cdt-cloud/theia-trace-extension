import { TspClient } from 'tsp-typescript-client/lib/protocol/tsp-client';
import { TimeGraphArrow, TimeGraphEntry, TimeGraphRow, TimeGraphState } from 'tsp-typescript-client/lib/models/timegraph';
import { TimeGraphStateComponent } from 'timeline-chart/lib/components/time-graph-state';
import { TimeGraphAnnotationComponent } from 'timeline-chart/lib/components/time-graph-annotation';
import { TimelineChart } from 'timeline-chart/lib/time-graph-model';
import { QueryHelper } from 'tsp-typescript-client/lib/models/query/query-helper';
import { OutputElementStyle } from 'tsp-typescript-client/lib/models/styles';
import { Annotation, Type } from 'tsp-typescript-client/lib/models/annotation';
import { TimeRange } from 'traceviewer-base/lib/utils/time-range';

enum ElementType {
    STATE = 'state',
    ANNOTATION = 'annotation'
}

export class TspDataProvider {

    private client: TspClient;
    private outputId: string;
    private traceUUID: string;
    private timeGraphEntries: TimeGraphEntry[];
    private timeGraphRows: TimeGraphRow[];

    public totalRange: bigint;

    constructor(client: TspClient, traceUUID: string, outputId: string) {
        this.timeGraphEntries = [];
        this.timeGraphRows = [];
        this.client = client;
        this.outputId = outputId;
        this.traceUUID = traceUUID;
        this.totalRange = BigInt(0);
    }

    async getData(ids: number[], entries: TimeGraphEntry[],
        totalTimeRange: TimeRange,
        viewRange?: TimelineChart.TimeGraphRange,
        resolution?: number,
        annotationMarkers?: string[]): Promise<TimelineChart.TimeGraphModel> {
        this.timeGraphEntries = [...entries];
        if (!this.timeGraphEntries.length) {
            return {
                id: 'model',
                totalLength: this.totalRange,
                rows: [],
                rangeEvents: [],
                arrows: [],
                data: {}
            };
        }

        this.totalRange = totalTimeRange.getEnd() - totalTimeRange.getStart();
        let fetchParameters = QueryHelper.selectionTimeQuery([],
            ids, annotationMarkers !== undefined ? { 'requested_marker_categories': annotationMarkers } : {});
        if (viewRange && resolution) {
            const start = totalTimeRange.getStart() + viewRange.start;
            const end = totalTimeRange.getStart() + viewRange.end;
            fetchParameters = QueryHelper.selectionTimeQuery(QueryHelper.splitRangeIntoEqualParts(start, end, resolution),
                ids, annotationMarkers !== undefined ? { 'requested_marker_categories': annotationMarkers } : {});
        }
        const tspClientResponse = await this.client.fetchTimeGraphStates(this.traceUUID, this.outputId, fetchParameters);
        const stateResponse = tspClientResponse.getModel();
        if (tspClientResponse.isOk() && stateResponse) {
            this.timeGraphRows = stateResponse.model.rows;
            this.timeGraphRowsOrdering(ids);
        } else {
            this.timeGraphRows = [];
        }

        // the start time which is normalized to logical 0 in timeline chart.
        const chartStart = totalTimeRange.getStart();
        const rows: TimelineChart.TimeGraphRowModel[] = [];
        this.timeGraphRows.forEach((row: TimeGraphRow) => {
            const rowId: number = row.entryId;
            const entry = this.timeGraphEntries.find(tgEntry => tgEntry.id === rowId);
            if (entry) {
                rows.push(this.getRowModel(row, chartStart, rowId, entry));
            }
        });

        const annotations: Map<number, TimelineChart.TimeGraphAnnotation[]> = new Map();
        const tspClientResponse2 = await this.client.fetchAnnotations(this.traceUUID, this.outputId, fetchParameters);
        const annotationsResponse = tspClientResponse2.getModel();
        const rangeEvents: TimelineChart.TimeGraphAnnotation[] = [];

        if (tspClientResponse2.isOk() && annotationsResponse) {
            Object.entries(annotationsResponse.model.annotations).forEach(([category, categoryArray]) => {
                categoryArray.forEach(annotation => {
                    if (annotation.type === Type.CHART) {
                        if (annotation.entryId === -1) {
                            rangeEvents.push(this.getAnnotation(category, annotation, rangeEvents.length, chartStart));
                        } else {
                            let entryArray = annotations.get(annotation.entryId);
                            if (entryArray === undefined) {
                                entryArray = [];
                                annotations.set(annotation.entryId, entryArray);
                            }
                            entryArray.push(this.getAnnotation(category, annotation, entryArray.length, chartStart));
                        }
                    }
                });
            });
        }
        for (const [entryId, entryArray] of annotations.entries()) {
            const row = rows.find(tgEntry => tgEntry.id === entryId);
            if (row) {
                row.annotations = entryArray;
            }
        }
        const arrows = await this.getArrows(ids, viewRange, resolution);

        return {
            id: 'model',
            totalLength: this.totalRange,
            rows,
            arrows,
            rangeEvents,
            data: {
                originalStart: chartStart
            }
        };
    }

    async getArrows(ids: number[], viewRange?: TimelineChart.TimeGraphRange, resolution?: number): Promise<TimelineChart.TimeGraphArrow[]> {
        let timeGraphArrows: TimeGraphArrow[] = [];
        if (viewRange && resolution) {
            const start = viewRange.start + this.timeGraphEntries[0].start;
            const end = viewRange.end + this.timeGraphEntries[0].start;
            const fetchParameters = QueryHelper.selectionTimeQuery(QueryHelper.splitRangeIntoEqualParts(
                start, end, resolution), ids);
            const tspClientResponseArrows = await this.client.fetchTimeGraphArrows(this.traceUUID, this.outputId, fetchParameters);
            const stateResponseArrows = tspClientResponseArrows.getModel();
            if (tspClientResponseArrows.isOk() && stateResponseArrows && stateResponseArrows.model) {
                timeGraphArrows = stateResponseArrows.model;
            }
        }
        const offset = this.timeGraphEntries[0].start;
        timeGraphArrows = timeGraphArrows.filter(arrow => ids.find(
            id => id === arrow.sourceId) && ids.find(id => id === arrow.targetId));
        const arrows = timeGraphArrows.map(arrow => ({
            sourceId: ids.indexOf(arrow.sourceId),
            destinationId: ids.indexOf(arrow.targetId),
            range: {
                start: arrow.start - offset,
                end: arrow.end - offset
            } as TimelineChart.TimeGraphRange
        } as TimelineChart.TimeGraphArrow));
        return arrows;
    }

    private timeGraphRowsOrdering(orderedIds: number[]) {
        const newTimeGraphRows: TimeGraphRow[] = [];
        orderedIds.forEach(id => {
            const timeGraphRow = this.timeGraphRows.find(row => row.entryId === id);
            if (timeGraphRow) {
                newTimeGraphRows.push(timeGraphRow);
            } else {
                const emptyRow: TimeGraphRow = { states: [{ start: BigInt(0), end: BigInt(0), label: '', tags: 0 }], entryId: id };
                newTimeGraphRows.push(emptyRow);
            }
        });

        this.timeGraphRows = newTimeGraphRows;
    }

    private getDefaultForGapStyle() {
        // Default color and height for the GAP state
        return {
            parentKey: '',
            values: {
                'background-color': '#CACACA',
                height: 1.0
            }
        };

    }

    private getRowModel(row: TimeGraphRow, chartStart: bigint, rowId: number, entry: TimeGraphEntry) {

        let gapStyle: OutputElementStyle;
        if (!entry.style) {
            gapStyle = this.getDefaultForGapStyle();
        } else {
            gapStyle = entry.style;
        }
        const states: TimelineChart.TimeGraphState[] = [];
        let prevPossibleState = entry.start;
        let nextPossibleState = entry.end;
        row.states.forEach((state: TimeGraphState, idx: number) => {
            const end = state.end - chartStart;
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
            if (idx === 0) {
                prevPossibleState = state.start - chartStart;
            }
            if (idx === row.states.length - 1) {
                nextPossibleState = state.end - chartStart;
            }
        });

        return {
            id: rowId,
            name: entry.labels[0], // 'row' + rowId,
            range: {
                start: entry.start - chartStart,
                end: entry.end - chartStart
            },
            states,
            annotations: [],
            prevPossibleState,
            nextPossibleState,
            gapStyle
        };
    }

    private getAnnotation(category: string, annotation: Annotation, idx: number, chartStart: bigint) {
        return {
            id: annotation.entryId + '-' + idx,
            category: category,
            range: {
                start: annotation.time - chartStart,
                end: annotation.time + annotation.duration - chartStart
            },
            label: annotation.label,
            data: {
                style: annotation.style
            },
        };
    }

    async fetchStateTooltip(element: TimeGraphStateComponent, viewRange: TimeRange): Promise<{ [key: string]: string } | undefined> {
        const elementRange = element.model.range;
        const offset = viewRange.getOffset() ? viewRange.getOffset() : BigInt(0);
        // use middle of state for fetching tooltip since hover time is not available
        const time = elementRange.start + (elementRange.end - elementRange.start) / BigInt(2) + (offset ? offset : BigInt(0));
        const requestedElement = {
            elementType: ElementType.STATE,
            time: element.model.range.start + (offset ? offset : BigInt(0)),
            duration: element.model.range.end - element.model.range.start
        };
        const entryId = [element.row.model.id];
        const parameters = QueryHelper.selectionTimeQuery([time], entryId, { [QueryHelper.REQUESTED_ELEMENT_KEY]: requestedElement });
        const tooltipResponse = await this.client.fetchTimeGraphTooltip(
            this.traceUUID, this.outputId, parameters);
        return tooltipResponse.getModel()?.model;
    }

    async fetchAnnotationTooltip(element: TimeGraphAnnotationComponent, viewRange: TimeRange): Promise<{ [key: string]: string } | undefined> {
        const elementRange = element.model.range;
        const offset = viewRange.getOffset() ? viewRange.getOffset() : BigInt(0);
        const time = elementRange.start + (offset ? offset : BigInt(0));
        const requestedElement = {
            elementType: ElementType.ANNOTATION,
            time: element.model.range.start + (offset ? offset : BigInt(0)),
            duration: element.model.range.end - element.model.range.start,
            entryId: element.row.model.id
        };
        const entryId = [element.row.model.id];
        const parameters = QueryHelper.selectionTimeQuery([time], entryId, { [QueryHelper.REQUESTED_ELEMENT_KEY]: requestedElement });
        const tooltipResponse = await this.client.fetchTimeGraphTooltip(
            this.traceUUID, this.outputId, parameters);
        return tooltipResponse.getModel()?.model;
    }
}
