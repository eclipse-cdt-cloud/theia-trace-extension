import { render, fireEvent, act } from '@testing-library/react';
import * as React from 'react';
import { TooltipComponent } from '../tooltip-component';

describe('TooltipComponent', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
    });

    it('renders content', async () => {
        render(<TooltipComponent visible={true} content="Test Content" />);
        const tooltip = document.querySelector('.trace-compass-tooltip') as HTMLElement;
        expect(tooltip.textContent).toBe('Test Content');
        expect(tooltip.style.opacity).toBe('1');
    });

    it('de-renders when visibility changes', async () => {
        const { rerender } = render(<TooltipComponent visible={true} content="Test" />);
        const tooltip = document.querySelector('.trace-compass-tooltip') as HTMLElement;

        expect(tooltip.style.opacity).toBe('1');

        rerender(<TooltipComponent visible={false} content="Test" />);
        await new Promise(resolve => setTimeout(resolve, 1001));
        expect(tooltip.style.opacity).toBe('0');
    });

    it('stays rendered when mouse moves on top of it', async () => {
        render(<TooltipComponent visible={true} content="Test" />);
        const tooltip = document.querySelector('.trace-compass-tooltip') as HTMLElement;

        fireEvent.mouseEnter(tooltip);
        await new Promise(resolve => setTimeout(resolve, 500));
        expect(tooltip.style.opacity).toBe('1');
    });
});
