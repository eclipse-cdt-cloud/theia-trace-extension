import * as React from 'react';
import { cleanup } from '@testing-library/react';
import { mount } from 'enzyme';
import { TooltipComponent } from '../tooltip-component';

afterEach(cleanup);

const model = {
  id: '123',
  range: { start: 1, end: 10 },
  label: 'model'
}
const tooltip = new TooltipComponent(10);
tooltip.setState = jest.fn();

describe('Tooltip component', () => {
  // Skip until a replacement for Enzyme that works with React 18 is found
  it.skip('renders itself', () => {
    const wrapper = mount(<TooltipComponent />);

    expect(wrapper.contains(<TooltipComponent />)).toBe(true);
  });

  it('displays a tooltip for a time graph state component', () => {
    tooltip.state = {
      element: undefined,
      func: undefined,
      content: undefined
    }
    tooltip.setElement(model);
    
    expect(tooltip.setState).toBeCalledWith({ element: model, func: undefined });
  });

  it('hides tooltip if mouse is not hovering over element', async () => {
    tooltip.state = {
      element: model,
      func: undefined,
      content: 'Test'
    }
    tooltip.setElement(undefined);
    await new Promise((r) => setTimeout(r, 500));
    
    expect(tooltip.setState).toBeCalledWith({ content: undefined });
  })

  it('hide tooltip because there is no content', () => {
    tooltip.state = {
      element: model,
      func: undefined,
      content: undefined
    }
    tooltip.setElement(undefined);
    
    expect(tooltip.setState).toBeCalledWith({ content: undefined });
  })

  // Skip until a replacement for Enzyme that works with React 18 is found
  it.skip('resets timer on mouse enter', () => {
    tooltip.state = {
      element: model,
      func: undefined,
      content: 'Test'
    }
    const wrapper = mount(<TooltipComponent />);
    wrapper.simulate('mouseenter');
    wrapper.simulate('mouseleave');
    
    expect(tooltip.setState).toBeCalledWith({ content: undefined });
  })
})
