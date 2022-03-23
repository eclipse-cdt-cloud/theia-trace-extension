export interface OutputComponentStyle {
    width: number;
    handleWidth: number;
    sashOffset: number;
    sashWidth: number;
    yAxisWidth: number;
    componentLeft: number;
    // react-grid-layout - The library used for resizing components
    // inserts new React components during compilation, and the dimensions
    // it returns are strings (pixels).
    // Currently, the components are only height-resizable.
    height: number | string;
    naviBackgroundColor: number;
    chartBackgroundColor: number;
    cursorColor: number;
    lineColor: number;
    rowHeight: number;
}
