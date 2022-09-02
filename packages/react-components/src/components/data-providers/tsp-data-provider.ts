/* eslint-disable @typescript-eslint/no-explicit-any */
import { TspClient } from 'tsp-typescript-client/lib/protocol/tsp-client';
import { TimeGraphArrow, TimeGraphEntry, TimeGraphRow, TimeGraphState } from 'tsp-typescript-client/lib/models/timegraph';
import { TimeGraphStateComponent } from 'timeline-chart/lib/components/time-graph-state';
import { TimeGraphAnnotationComponent } from 'timeline-chart/lib/components/time-graph-annotation';
import { TimelineChart } from 'timeline-chart/lib/time-graph-model';
import { QueryHelper } from 'tsp-typescript-client/lib/models/query/query-helper';
import { OutputElementStyle } from 'tsp-typescript-client/lib/models/styles';
import { Annotation, Type } from 'tsp-typescript-client/lib/models/annotation';
import { TimeRange } from 'traceviewer-base/lib/utils/time-range';
import { GenericResponse, TspClientResponse } from 'tsp-typescript-client';

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

    /**
     * @param ids requested entry ids
     * @param entries time graph entries
     * @param totalTimeRange total time range
     * @param viewRange requested view range relative to start of total time range
     * @param nbTimes number of requested time samples
     * @param annotationMarkers requested annotation categories
     * @returns time graph model
     */
    async getData(ids: number[], entries: TimeGraphEntry[], totalTimeRange: TimeRange, worldRange?: TimelineChart.TimeGraphRange,
        nbTimes?: number, annotationMarkers?: string[], markerSetId?: string): Promise<TimelineChart.TimeGraphModel> {
        this.timeGraphEntries = [...entries];
        if (!this.timeGraphEntries.length || !worldRange || !nbTimes) {
            return {
                id: 'model',
                totalLength: this.totalRange,
                rows: [],
                rangeEvents: [],
                arrows: [],
                data: {}
            };
        }

        // Fire all TSP requests
        this.totalRange = totalTimeRange.getEnd() - totalTimeRange.getStart();
        const start = totalTimeRange.getStart() + worldRange.start;
        const end = totalTimeRange.getStart() + worldRange.end;
        const timeGraphStateParams = QueryHelper.selectionTimeRangeQuery(start, end, nbTimes, ids);
        const statesPromise = this.client.fetchTimeGraphStates(this.traceUUID, this.outputId, timeGraphStateParams);

        const additionalProps: { [key: string]: any } = {};
        if (annotationMarkers) {
            additionalProps['requested_marker_categories'] = annotationMarkers;
        }
        if (markerSetId) {
            additionalProps['requested_marker_set'] = markerSetId;
        }
        const annotationParams = QueryHelper.selectionTimeRangeQuery(start, end, nbTimes, ids, additionalProps);
        const annotations: Map<number, TimelineChart.TimeGraphAnnotation[]> = new Map();
        const annotationsPromise = this.client.fetchAnnotations(this.traceUUID, this.outputId, annotationParams);

        const arrowStart = worldRange.start + this.timeGraphEntries[0].start;
        const arrowEnd = worldRange.end + this.timeGraphEntries[0].start;
        const fetchParameters = QueryHelper.timeRangeQuery(arrowStart, arrowEnd, nbTimes);
        const arrowsPromise = this.client.fetchTimeGraphArrows(this.traceUUID, this.outputId, fetchParameters);

        // Wait for responses
        const [tspClientAnnotationsResponse, tspClientStatesResponse, tspClientArrowsResponse] = await Promise.all([annotationsPromise, statesPromise, arrowsPromise]);

        // the start time which is normalized to logical 0 in timeline chart.
        const chartStart = totalTimeRange.getStart();

        const annotationsResponse = tspClientAnnotationsResponse.getModel();
        const rangeEvents: TimelineChart.TimeGraphAnnotation[] = [];
        if (tspClientAnnotationsResponse.isOk() && annotationsResponse) {
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

        const stateResponse = tspClientStatesResponse.getModel();

        if (tspClientStatesResponse.isOk() && stateResponse) {
            this.timeGraphRows = stateResponse.model.rows;
            this.timeGraphRowsOrdering(ids);
        } else {
            this.timeGraphRows = [];
        }

        const rows: TimelineChart.TimeGraphRowModel[] = [];
        this.timeGraphRows.forEach((row: TimeGraphRow) => {
            const rowId: number = row.entryId;
            const entry = this.timeGraphEntries.find(tgEntry => tgEntry.id === rowId);
            if (entry) {
                rows.push(this.getRowModel(row, chartStart, rowId, entry));
            }
        });

        for (const [entryId, entryArray] of annotations.entries()) {
            const row = rows.find(tgEntry => tgEntry.id === entryId);
            if (row) {
                row.annotations = entryArray;
            }
        }

        const arrows = this.getArrows(tspClientArrowsResponse, worldRange, nbTimes);

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

    private getArrows(tspClientArrowsResponse: TspClientResponse<GenericResponse<TimeGraphArrow[]>>,
        viewRange?: TimelineChart.TimeGraphRange, nbTimes?: number): TimelineChart.TimeGraphArrow[] {

        let timeGraphArrows: TimeGraphArrow[] = [];
        if (viewRange && nbTimes) {
            const stateResponseArrows = tspClientArrowsResponse.getModel();
            if (tspClientArrowsResponse.isOk() && stateResponseArrows && stateResponseArrows.model) {
                timeGraphArrows = stateResponseArrows.model;
            }
        }
        const offset = this.timeGraphEntries[0].start;
        const arrows = timeGraphArrows.map(arrow => ({
                sourceId: arrow.sourceId,
                destinationId: arrow.targetId,
                range: {
                    start: arrow.start - offset,
                    end: arrow.end - offset
                } as TimelineChart.TimeGraphRange
            } as TimelineChart.TimeGraphArrow
        ));
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
                label: state.label,
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
            }
        };
    }

    async fetchStateTooltip(element: TimeGraphStateComponent, viewRange: TimeRange): Promise<{ [key: string]: string } | undefined> {
        const offset = viewRange.getOffset() ? viewRange.getOffset() : BigInt(0);
        // use start of state for fetching tooltip since hover time is not available
        const time = element.model.range.start + (offset ? offset : BigInt(0));
        const requestedElement = {
            elementType: ElementType.STATE,
            time: time,
            duration: element.model.range.end - element.model.range.start
        };
        const entryId = [element.row.model.id];
        const parameters = QueryHelper.selectionTimeQuery([time], entryId, { [QueryHelper.REQUESTED_ELEMENT_KEY]: requestedElement });
        const tooltipResponse = await this.client.fetchTimeGraphTooltip(this.traceUUID, this.outputId, parameters);
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
        const tooltipResponse = await this.client.fetchTimeGraphTooltip(this.traceUUID, this.outputId, parameters);
        return tooltipResponse.getModel()?.model;
    }
}
