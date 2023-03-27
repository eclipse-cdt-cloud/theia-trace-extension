import * as React from 'react';
import { cleanup, fireEvent, render } from '@testing-library/react';
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
  it('renders itself', () => {
    let tooltipComponent: React.RefObject<TooltipComponent>;
    tooltipComponent = React.createRef();
    const { getByTestId } = render(<TooltipComponent ref={tooltipComponent} />);
    expect(getByTestId('tooltip-component')).toBeDefined();
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
  it('resets timer on mouse enter', () => {
    tooltip.state = {
      element: model,
      func: undefined,
      content: 'Test'
    }
    const { getByTestId } = render(<TooltipComponent />);
    fireEvent.mouseEnter(getByTestId('tooltip-component'));
    fireEvent.mouseLeave(getByTestId('tooltip-component'));
    expect(tooltip.setState).toBeCalledWith({ content: undefined });
  })
})
