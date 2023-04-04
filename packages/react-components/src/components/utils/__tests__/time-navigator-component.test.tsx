import * as React from 'react';
import { cleanup, render } from '@testing-library/react';
import { TimeNavigatorComponent } from '../time-navigator-component';
import { TimeGraphUnitController } from 'timeline-chart/lib/time-graph-unit-controller';

describe('Time axis component', () => {

  let axisComponent: any;
  const ref = (el: TimeNavigatorComponent | undefined | null): void => {
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
    const unitController: TimeGraphUnitController = new TimeGraphUnitController(BigInt(10), { start: BigInt(0), end: BigInt(10)});
    const style = {
      width: 600,
      chartOffset: 200,
      naviBackgroundColor: 0xf4f7fb,
      cursorColor: 0x259fd8,
      lineColor: 0x757575
    }

    render(<div><TimeNavigatorComponent unitController={unitController} style={style} addWidgetResizeHandler={() => null} removeWidgetResizeHandler={() => null} ref={ref}/></div>);
    expect(axisComponent).toBeTruthy();
    expect(axisComponent instanceof TimeNavigatorComponent).toBe(true);
  });

  it('creates canvas', () => {
    const unitController: TimeGraphUnitController = new TimeGraphUnitController(BigInt(10), { start: BigInt(0), end: BigInt(10)});
    const style = {
      width: 600,
      chartOffset: 200,
      naviBackgroundColor: 0xf4f7fb,
      cursorColor: 0x259fd8,
      lineColor: 0x757575
    }

    const { container} = render(<div><TimeNavigatorComponent unitController={unitController} style={style} addWidgetResizeHandler={() => null} removeWidgetResizeHandler={() => null} ref={ref}/></div>);
    expect(container).toMatchSnapshot();
  });
});
