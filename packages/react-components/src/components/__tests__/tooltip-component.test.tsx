import * as React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { TooltipComponent } from '../tooltip-component';

const model = {
  id: '123',
  range: { start: 1, end: 10 },
  label: 'model'
}
const tooltip = new TooltipComponent(10);
tooltip.setState = jest.fn();

describe('Tooltip component', () => {

  let axisComponent: any;
  const ref = (el: TooltipComponent | undefined | null): void => {
    axisComponent = el;
  };

  beforeEach(() => {
    axisComponent = null;
  });

  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
  });

  /*
   * Skip due to issues with TooltipComponent:
   *
   * react-tooltip v4.2.14 works in the application but causes an exception
   * in tests (https://github.com/ReactTooltip/react-tooltip/issues/681),
   * which is fixed in v4.2.17. However, version v4.2.17 breaks the tooltip
   * when running in the application.
   */
  it.skip('renders itself', () => {
    render(<TooltipComponent />);
    expect(axisComponent).toBeTruthy();
    expect(axisComponent instanceof TooltipComponent).toBe(true);
  });

  // Skip due to issues with TooltipComponent (see above for details)
  it.skip('resets timer on mouse enter', () => {
      tooltip.state = {
        element: model,
        func: undefined,
        content: 'Test'
      }
      render(<TooltipComponent />);
      const component = screen.getByRole('tooltip-component-role');
      fireEvent.mouseEnter(component);
      fireEvent.mouseLeave(component);

      expect(tooltip.setState).toBeCalledWith({ content: undefined });
  })

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
})
