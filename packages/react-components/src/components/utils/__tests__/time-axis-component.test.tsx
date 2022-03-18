import * as React from 'react';
import { cleanup } from '@testing-library/react';
import { mount } from 'enzyme';
import { TimeAxisComponent } from '../time-axis-component';
import { TimeGraphUnitController } from 'timeline-chart/lib/time-graph-unit-controller';
import { OutputComponentStyle } from '../output-component-style';

afterEach(cleanup);

describe('Time axis component', () => {
  it('renders with provided style', () => {
    const unitController: TimeGraphUnitController = new TimeGraphUnitController(BigInt(10), { start: BigInt(0), end: BigInt(10)});
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
    }

    const wrapper = mount(<TimeAxisComponent unitController={unitController} style={style} addWidgetResizeHandler={() => null} removeWidgetResizeHandler={() => null}/>);
    expect(wrapper.contains(<TimeAxisComponent unitController={unitController} style={style} addWidgetResizeHandler={() => null} removeWidgetResizeHandler={() => null}/>));
  });

  it('creates canvas', () => {
    const unitController: TimeGraphUnitController = new TimeGraphUnitController(BigInt(10), { start: BigInt(0), end: BigInt(10)});
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
    }

    const wrapper = mount(<TimeAxisComponent unitController={unitController} style={style} addWidgetResizeHandler={() => null} removeWidgetResizeHandler={() => null}/>);
    expect(wrapper.find('canvas')).toHaveLength(1);
  });
});
