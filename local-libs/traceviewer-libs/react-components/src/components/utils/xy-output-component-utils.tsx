import { TimeRange } from 'traceviewer-base/lib/utils/time-range';
import { AbstractOutputProps } from '../abstract-output-component';

export interface XYChartFactoryParams {
    viewRange: TimeRange;
    allMax: number;
    allMin: number;
    isScatterPlot: boolean;
}

export interface XYOutputMargin {
    top: number;
    right: number;
    bottom: number;
    left: number;
}

export interface GetClosestPointParam {
    dataPoints: XYPoint[];
    mousePosition: XYPoint;
    chartWidth: number;
    chartHeight: number;
    range: TimeRange;
    margin: XYOutputMargin;
    allMax: number;
    allMin: number;
}

export interface DrawSelectionParams {
    ctx: CanvasRenderingContext2D | null;
    chartArea: Chart.ChartArea | undefined | null;
    startPixel: number;
    endPixel: number;
    isBarPlot: boolean;
    props: AbstractOutputProps;
    invertSelection: boolean;
}

export interface XYPoint {
    x: number;
    y: number;
}

export function xyChartFactory(params: XYChartFactoryParams): Chart.ChartOptions {
    const baseOptions: Chart.ChartOptions = getDefaultChartOptions(params);

    // If the chart is a line chart
    if (!params.isScatterPlot) {
        return getLineChartOptions(baseOptions);
    }

    return getScatterChartOptions(baseOptions);
}

function getLineChartOptions(lineOptions: Chart.ChartOptions): Chart.ChartOptions {
    if (lineOptions.elements && lineOptions.elements.point && lineOptions.elements.line && lineOptions.scales) {
        lineOptions.elements.point.radius = 0;
        lineOptions.elements.line.borderWidth = 0;
        lineOptions.scales.xAxes = [{ id: 'time-axis', display: false }];
    }

    return lineOptions;
}

function getScatterChartOptions(scatterOptions: Chart.ChartOptions): Chart.ChartOptions {
    if (scatterOptions.elements && scatterOptions.elements.point) {
        scatterOptions.elements.point.radius = 2;
    }

    return scatterOptions;
}

function getDefaultChartOptions(params: XYChartFactoryParams): Chart.ChartOptions {
    const offset = params.viewRange?.getOffset() ?? BigInt(0);

    const lineOptions: Chart.ChartOptions = {
        responsive: true,
        elements: {
            point: { radius: 1 },
            line: {
                tension: 0,
                borderWidth: 2
            }
        },
        maintainAspectRatio: false,
        legend: { display: false },
        tooltips: {
            intersect: false,
            mode: 'index',
            enabled: false
        },
        layout: {
            padding: {
                left: 0,
                right: 0,
                top: 15,
                bottom: 5
            }
        },
        scales: {
            xAxes: [
                {
                    id: 'time-axis',
                    display: false,
                    ticks: {
                        min: Number(params.viewRange?.getStart() - offset),
                        max: Number(params.viewRange?.getEnd() - offset)
                    }
                }
            ],
            yAxes: [
                {
                    display: false,
                    stacked: false,
                    ticks: {
                        max: params.allMax > 0 ? params.allMax : 100,
                        min: params.allMin
                    }
                }
            ]
        },
        animation: { duration: 0 },
        events: ['mousedown']
    };

    return lineOptions;
}

export function drawSelection(params: DrawSelectionParams): void {
    const { startPixel, endPixel, isBarPlot, chartArea, props, ctx, invertSelection } = params;
    const minPixel = Math.min(startPixel, endPixel);
    const maxPixel = Math.max(startPixel, endPixel);
    const initialPoint = isBarPlot ? 0 : chartArea?.left ?? 0;
    const chartHeight = parseInt(props.style.height.toString());
    const finalPoint = isBarPlot ? chartHeight : chartArea?.bottom ?? 0;

    if (ctx) {
        ctx.save();

        ctx.lineWidth = 1;
        // Selection borders
        if (startPixel > initialPoint) {
            ctx.beginPath();
            ctx.moveTo(minPixel, 0);
            ctx.lineTo(minPixel, finalPoint);
            ctx.stroke();
        }
        if (endPixel < props.viewRange.getEnd()) {
            ctx.beginPath();
            ctx.moveTo(maxPixel, 0);
            ctx.lineTo(maxPixel, finalPoint);
            ctx.stroke();
        }

        // Selection fill
        ctx.globalAlpha = 0.2;
        if (!invertSelection) {
            ctx.fillRect(minPixel, 0, maxPixel - minPixel, finalPoint);
        } else {
            const leftSideWidth = -minPixel;
            const rightSideWidth = (chartArea?.right ? chartArea.right : 0) - maxPixel;

            ctx.fillRect(minPixel, 0, leftSideWidth, finalPoint);
            ctx.fillRect(maxPixel, 0, rightSideWidth, finalPoint);
        }

        ctx.restore();
    }
}

export function getClosestPointForScatterPlot(params: GetClosestPointParam): XYPoint | undefined {
    let min_hypotenuse = Number.MAX_VALUE;
    let closestPoint = undefined;
    const offset = params.range.getOffset() ?? BigInt(0);
    const start = params.range.getStart();
    const end = params.range.getEnd();
    const xRatio = params.chartWidth / Number(end - start);
    const yRatio = (params.chartHeight - params.margin.top - params.margin.bottom) / (params.allMax - params.allMin);

    params.dataPoints.forEach((point: XYPoint) => {
        const x = (point.x - Number(start - offset)) * xRatio;
        const y = (point.y - params.allMin) * yRatio + params.margin.bottom;
        const distX = params.mousePosition.x - x;
        const distY = params.chartHeight - params.mousePosition.y - y;
        const hypotenuse = distX * distX + distY * distY;

        if (min_hypotenuse > hypotenuse) {
            closestPoint = point;
            min_hypotenuse = hypotenuse;
        }
    });

    // Return closest point only if it is in a circle with a radius of 20 pixels
    if (min_hypotenuse < 400) {
        return closestPoint;
    }

    return undefined;
}

export function numberFormat(rawNumber: number): string {
    return new Intl.NumberFormat().format(rawNumber);
}
