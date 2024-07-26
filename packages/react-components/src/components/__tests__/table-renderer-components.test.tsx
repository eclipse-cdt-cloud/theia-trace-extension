import * as React from 'react';
import { cleanup, render, fireEvent, screen, act } from '@testing-library/react';
import { create } from 'react-test-renderer';
import { TableOutputComponent } from '../table-output-component';
import { CellRenderer, LoadingRenderer, SearchFilterRenderer } from '../table-renderer-components';
import { AbstractOutputProps } from '../abstract-output-component';
import { TimeGraphUnitController } from 'timeline-chart/lib/time-graph-unit-controller';
import { TimeRange } from 'traceviewer-base/lib/utils/time-range';
import { HttpTspClient } from 'tsp-typescript-client/lib/protocol/http-tsp-client';
import { ColDef, Column, GridApi, IRowModel, RowNode } from '@ag-grid-community/core';

describe('<TableOutputComponent />', () => {
    let tableComponent: any;
    const ref = (el: TableOutputComponent | undefined | null): void => {
        tableComponent = el;
    };

    beforeEach(() => {
        tableComponent = null;
    });

    afterEach(() => {
        cleanup();
        jest.clearAllMocks();
    });

    test('Renders AG-Grid table with provided props & state', async () => {
        const tableOutputComponentProps: AbstractOutputProps = {
            tooltipComponent: null,
            style: {
                width: 0,
                height: 0,
                rowHeight: 0,
                naviBackgroundColor: 0,
                chartBackgroundColor: 0,
                cursorColor: 0,
                lineColor: 0,
                componentLeft: 0,
                chartOffset: 0
            },
            tspClient: new HttpTspClient('testURL'),
            traceId: '0',
            outputDescriptor: {
                id: '0',
                name: '',
                description: '',
                type: '',
                queryParameters: new Map<string, any>(),
                start: BigInt(0),
                end: BigInt(0),
                final: true,
                compatibleProviders: []
            },
            markerCategories: undefined,
            markerSetId: '0',
            range: new TimeRange(BigInt(0), BigInt(0)),
            nbEvents: 0,
            viewRange: new TimeRange(BigInt(0), BigInt(0)),
            selectionRange: undefined,
            onOutputRemove: () => 0,
            unitController: new TimeGraphUnitController(BigInt(0), { start: BigInt(0), end: BigInt(0) }),
            backgroundTheme: 'light',
            tooltipXYComponent: null,
            outputWidth: 0
        };

        const tableOutputComponentState = [
            {
                headerName: 'Trace',
                field: '0',
                width: 0,
                resizable: true,
                cellRenderer: 'cellRenderer',
                cellRendererParams: { filterModel: {}, searchResultsColor: '#cccc00' },
                suppressMenu: true,
                filter: 'agTextColumnFilter',
                floatingFilter: true,
                floatingFilterComponent: 'searchFilterRenderer',
                floatingFilterComponentParams: { suppressFilterButton: true, colName: '0' },
                icons: { filter: '' },
                tooltipField: '0'
            }
        ];

        const { container } = render(<TableOutputComponent {...tableOutputComponentProps} ref={ref} />);
        expect(tableComponent).toBeTruthy();
        expect(tableComponent instanceof TableOutputComponent).toBe(true);
        const table: TableOutputComponent = tableComponent;
        act(() => {
            // fire events that update state
            table.setState({ tableColumns: tableOutputComponentState });
        });

        // Renders with provided props
        expect(table.state.tableColumns).toEqual(tableOutputComponentState);
        expect(table.props.backgroundTheme).toEqual('light');
        expect(table.props.tooltipComponent).toEqual(null);
        expect(table.props.style).toEqual({
            width: 0,
            height: 0,
            rowHeight: 0,
            naviBackgroundColor: 0,
            chartBackgroundColor: 0,
            cursorColor: 0,
            lineColor: 0,
            componentLeft: 0,
            chartOffset: 0
        });
        expect(container).toMatchSnapshot();
    });

    const mockOnFilterChange = jest.fn();
    const mockOnClickNext = jest.fn();
    const mockOnClickPrevious = jest.fn();
    const mockParentilterInstance = jest.fn();
    const mockCurrentParentModel = jest.fn();
    const mockFilterChangedCallback = jest.fn();
    const mockFilterModifiedCallback = jest.fn();
    const mockValueGetter = jest.fn();
    const mockDoesRowPassOtherFilter = jest.fn();
    const mockShowParentFilter = jest.fn();

    // test('Empty search filter renderer', () => {
    //     const searchFilter = create(
    //         <SearchFilterRenderer
    //             colName={'jest Test'}
    //             onFilterChange={mockOnFilterChange}
    //             onclickNext={mockOnClickNext}
    //             onclickPrevious={mockOnClickPrevious}
    //             column={new Column({} as ColDef, {} as ColDef, 'jest Test', true)}
    //             filterParams={{
    //                 api: new GridApi(),
    //                 column: new Column({} as ColDef, {} as ColDef, 'jest Test', true),
    //                 colDef: {} as ColDef,
    //                 columnApi: new ColumnApi(),
    //                 rowModel: '' as unknown as IRowModel,
    //                 filterChangedCallback: mockFilterChangedCallback,
    //                 filterModifiedCallback: mockFilterModifiedCallback,
    //                 valueGetter: mockValueGetter,
    //                 doesRowPassOtherFilter: mockDoesRowPassOtherFilter,
    //                 context: ''
    //             }}
    //             currentParentModel={mockCurrentParentModel}
    //             parentFilterInstance={mockParentilterInstance}
    //             suppressFilterButton={false}
    //             api={new GridApi()}
    //             columnApi={new ColumnApi()}
    //             showParentFilter={mockShowParentFilter}
    //             context={''}
    //             filterModel={new Map<string, string>()}
    //         />
    //     ).toJSON();
    //     expect(searchFilter).toMatchSnapshot();
    // });

    // test('Search filter renderer key interactions', () => {
    //     render(
    //         <SearchFilterRenderer
    //             colName={'jest Test'}
    //             onFilterChange={mockOnFilterChange}
    //             onclickNext={mockOnClickNext}
    //             onclickPrevious={mockOnClickPrevious}
    //             column={new Column({} as ColDef, {} as ColDef, 'jest Test', true)}
    //             filterParams={{
    //                 api: new GridApi(),
    //                 column: new Column({} as ColDef, {} as ColDef, 'jest Test', true),
    //                 colDef: {} as ColDef,
    //                 columnApi: new ColumnApi(),
    //                 rowModel: '' as unknown as IRowModel,
    //                 filterChangedCallback: mockFilterChangedCallback,
    //                 filterModifiedCallback: mockFilterModifiedCallback,
    //                 valueGetter: mockValueGetter,
    //                 doesRowPassOtherFilter: mockDoesRowPassOtherFilter,
    //                 context: ''
    //             }}
    //             currentParentModel={mockCurrentParentModel}
    //             parentFilterInstance={mockParentilterInstance}
    //             suppressFilterButton={false}
    //             api={new GridApi()}
    //             columnApi={new ColumnApi()}
    //             showParentFilter={mockShowParentFilter}
    //             context={''}
    //             filterModel={new Map<string, string>()}
    //         />
    //     );

    //     const parentDiv = screen.getByTestId('search-filter-element-parent');
    //     fireEvent.click(parentDiv);
    //     const input = screen.getByTestId('search-filter-element-input');
    //     fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', charCode: 13 });
    //     expect(mockOnClickNext).toHaveBeenCalledTimes(1);
    //     fireEvent.keyDown(input, { key: 'Escape', code: 'Escape', charCode: 27 });
    //     expect(mockOnFilterChange).toHaveBeenCalledTimes(1);
    // });

    // const cellRendererProps: any = {
    //     value: 'test cell',
    //     valueFormatted: 'test cell',
    //     getValue: function () {
    //         return 'test cell';
    //     },
    //     setValue: function (val: any): void {
    //         const value = val;
    //     },
    //     formatValue: function (value: any) {
    //         return value;
    //     },
    //     data: {},
    //     node: {} as RowNode,
    //     colDef: {} as ColDef,
    //     column: new Column({} as ColDef, {} as ColDef, 'jest Test', true),
    //     rowIndex: 0,
    //     api: new GridApi(),
    //     columnApi: new ColumnApi(),
    //     context: '',
    //     refreshCell: () => {},
    //     $scope: '',
    //     eGridCell: document.createElement('div'),
    //     eParentOfValue: document.createElement('div'),
    //     addRenderedRowListener: function (eventType: string, listener: Function): void {
    //         throw new Error('Function not implemented.');
    //     },
    //     searchResultsColor: '#FFFF00',
    //     filterModel: new Map<string, string>()
    // };

    // test('Cell renderer', () => {
    //     const cellRenderer = create(<CellRenderer {...cellRendererProps} />).toJSON();
    //     expect(cellRenderer).toMatchSnapshot();
    // });

    // test('Cell renderer with search selection', () => {
    //     cellRendererProps.colDef.field = 'testField';
    //     cellRendererProps.filterModel.set('testField', 'test');
    //     cellRendererProps.data = { isMatched: true };

    //     const cellRenderer = create(<CellRenderer {...cellRendererProps} />).toJSON();
    //     expect(cellRenderer).toMatchSnapshot();
    // });

    // test('Loading renderer not loading', () => {
    //     delete cellRendererProps.filterModel;
    //     delete cellRendererProps.searchResultsColor;

    //     const loadingRenderer = create(<LoadingRenderer {...cellRendererProps} />).toJSON();
    //     expect(loadingRenderer).toMatchSnapshot();
    // });

    // test('Loading renderer in loading', () => {
    //     cellRendererProps.value = undefined;

    //     const loadingRenderer = create(<LoadingRenderer {...cellRendererProps} />).toJSON();
    //     expect(loadingRenderer).toMatchSnapshot();
    // });
});
