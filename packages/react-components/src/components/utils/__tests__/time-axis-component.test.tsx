import * as React from 'react';
import { cleanup, render, renderHook } from '@testing-library/react';
import { TimeAxisComponent } from '../time-axis-component';
import { TimeGraphUnitController } from 'timeline-chart/lib/time-graph-unit-controller';
import { OutputComponentStyle } from '../output-component-style';

describe('Time axis component', () => {
    let axisComponent: any;
    const ref = (el: TimeAxisComponent | undefined | null): void => {
        axisComponent = el;
    };

    beforeEach(() => {
        axisComponent = null;
    });

    afterEach(() => {
        cleanup();
        jest.clearAllMocks();
    });

    it('renders with provided style', () => {
        const unitController: TimeGraphUnitController = new TimeGraphUnitController(BigInt(10), {
            start: BigInt(0),
            end: BigInt(10)
        });
        const style: OutputComponentStyle = {
            width: 600,
            chartOffset: 200,
            componentLeft: 0,
            height: 100,
            rowHeight: 100,
            naviBackgroundColor: 0xf4f7fb,
            chartBackgroundColor: 0xf4f7fb,
            cursorColor: 0x259fd8,
            lineColor: 0x757575
        };
        render(
            <div>
                <TimeAxisComponent
                    unitController={unitController}
                    style={{ ...style, verticalAlign: 'bottom' }}
                    addWidgetResizeHandler={() => null}
                    removeWidgetResizeHandler={() => null}
                    ref={ref}
                />
            </div>
        );
        expect(axisComponent).toBeTruthy();
        expect(axisComponent instanceof TimeAxisComponent).toBe(true);
    });

    it('creates canvas', () => {
        const unitController: TimeGraphUnitController = new TimeGraphUnitController(BigInt(10), {
            start: BigInt(0),
            end: BigInt(10)
        });
        const style: OutputComponentStyle = {
            width: 600,
            chartOffset: 200,
            componentLeft: 0,
            height: 100,
            rowHeight: 100,
            naviBackgroundColor: 0xf4f7fb,
            chartBackgroundColor: 0xf4f7fb,
            cursorColor: 0x259fd8,
            lineColor: 0x757575
        };

        const { container } = render(
            <div>
                <TimeAxisComponent
                    unitController={unitController}
                    style={{ ...style, verticalAlign: 'bottom' }}
                    addWidgetResizeHandler={() => null}
                    removeWidgetResizeHandler={() => null}
                />
            </div>
        );
        expect(container).toMatchSnapshot();
    });
});
