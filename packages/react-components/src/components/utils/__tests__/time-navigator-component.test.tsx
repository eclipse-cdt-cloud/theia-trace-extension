import * as React from 'react';
import { cleanup } from '@testing-library/react';
import { TimeNavigatorComponent } from '../time-navigator-component';
import { TimeGraphUnitController } from 'timeline-chart/lib/time-graph-unit-controller';
import { mount } from 'enzyme';

afterEach(cleanup);

describe('Time axis component', () => {
  // Skip until a replacement for Enzyme that works with React 18 is found
  it.skip('renders with provided style', () => {
    const unitController: TimeGraphUnitController = new TimeGraphUnitController(BigInt(10), { start: BigInt(0), end: BigInt(10)});
    const style = {
      width: 600,
      chartOffset: 200,
      naviBackgroundColor: 0xf4f7fb,
      cursorColor: 0x259fd8,
      lineColor: 0x757575
    }

    const wrapper = mount(<TimeNavigatorComponent unitController={unitController} style={style} addWidgetResizeHandler={() => null} removeWidgetResizeHandler={() => null}/>);
    expect(wrapper.contains(<TimeNavigatorComponent unitController={unitController} style={style} addWidgetResizeHandler={() => null} removeWidgetResizeHandler={() => null}/>));
  });

  // Skip until a replacement for Enzyme that works with React 18 is found
  it.skip('creates canvas', () => {
    const unitController: TimeGraphUnitController = new TimeGraphUnitController(BigInt(10), { start: BigInt(0), end: BigInt(10)});
    const style = {
      width: 600,
      chartOffset: 200,
      naviBackgroundColor: 0xf4f7fb,
      cursorColor: 0x259fd8,
      lineColor: 0x757575
    }

    const wrapper = mount(<TimeNavigatorComponent unitController={unitController} style={style} addWidgetResizeHandler={() => null} removeWidgetResizeHandler={() => null}/>);
    expect(wrapper.find('canvas')).toHaveLength(1);
  });
});
