import * as React from 'react';
import { createPortal } from 'react-dom';
import { debounce } from 'lodash';
const { useState, useEffect, useRef, useMemo } = React;

interface TooltipProps {
    content?: React.ReactNode;
    visible?: boolean;
    fadeTransition?: number;
}

interface TooltipState {
    content: React.ReactNode;
    visible: boolean;
    zIndex: number;
}

export const TooltipComponent = ({ content = '⏳', visible = false, fadeTransition = 500 }: TooltipProps) => {
    // eslint-disable-next-line no-null/no-null
    const tooltipRef = useRef<HTMLDivElement>(null);
    const lastMousePosition = useRef({ x: 0, y: 0 });
    const [state, setState] = useState<TooltipState>({
        content,
        visible,
        zIndex: visible ? 99999 : -99999
    });
    const isMouseOverRef = useRef(false);

    // Calculate position based on current mouse position and tooltip dimensions
    const calculateAndSetPosition = () => {
        if (!tooltipRef.current) {
            return;
        }

        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const tooltipRect = tooltipRef.current.getBoundingClientRect();

        let x = lastMousePosition.current.x + 10;
        let y = lastMousePosition.current.y + 10;

        if (x + tooltipRect.width > viewportWidth) {
            x = lastMousePosition.current.x - tooltipRect.width - 10;
        }

        if (y + tooltipRect.height > viewportHeight) {
            y = lastMousePosition.current.y - tooltipRect.height - 10;
        }

        tooltipRef.current.style.left = `${x}px`;
        tooltipRef.current.style.top = `${y}px`;
    };

    const debouncedUpdate = useMemo(
        () =>
            debounce((newState: Partial<TooltipState>) => {
                setState(prevState => {
                    const updatedState = { ...prevState, ...newState };

                    const weAreHidingTooltip = prevState.visible === true && newState.visible === false;
                    const weAreHoveringOverTooltip = isMouseOverRef.current;

                    if (weAreHoveringOverTooltip) {
                        debouncedUpdate.cancel();
                        return prevState;
                    } else if (weAreHidingTooltip) {
                        // Don't update the content
                        updatedState.content = prevState.content;
                        // Keep z-index high during fade out
                        updatedState.zIndex = prevState.zIndex;
                        return updatedState;
                    } else {
                        calculateAndSetPosition();
                        // Update z-index immediately when showing
                        if (newState.visible) {
                            updatedState.zIndex = 99999;
                        }
                        return updatedState;
                    }
                });
            }, 500),
        []
    );

    // Track mouse position and detect when mouse leaves viewport
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            lastMousePosition.current = { x: e.clientX, y: e.clientY };
        };

        const handleMouseLeave = (e: MouseEvent) => {
            // Check if the mouse has actually left the viewport
            if (e.clientY <= 0 || e.clientY >= window.innerHeight || e.clientX <= 0 || e.clientX >= window.innerWidth) {
                setState(prev => ({ ...prev, visible: false }));
            }
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseleave', handleMouseLeave);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseleave', handleMouseLeave);
        };
    }, [debouncedUpdate]);

    // Hide tooltip when scrolling
    useEffect(() => {
        const handleScroll = () => {
            setState(prev => ({
                ...prev,
                visible: false
            }));
        };

        // Use capture to catch all scroll events before they might be stopped
        const options = { capture: true };

        window.addEventListener('scroll', handleScroll, options);
        document.addEventListener('scroll', handleScroll, options);

        return () => {
            window.removeEventListener('scroll', handleScroll, options);
            document.removeEventListener('scroll', handleScroll, options);
        };
    }, []);

    // Handle content and visibility changes
    useEffect(() => {
        if (!isMouseOverRef.current) {
            debouncedUpdate({ content, visible });
        }
    }, [content, visible, debouncedUpdate]);

    // Cleanup debounced function
    useEffect(
        () => () => {
            debouncedUpdate.cancel();
        },
        [debouncedUpdate]
    );

    // Handle opacity transition end
    useEffect(() => {
        const tooltip = tooltipRef.current;
        if (!tooltip) {
            return;
        }

        const handleTransitionEnd = (e: TransitionEvent) => {
            if (e.propertyName === 'opacity' && !state.visible) {
                setState(prev => ({ ...prev, zIndex: -99999 }));
            }
        };

        tooltip.addEventListener('transitionend', handleTransitionEnd);
        return () => {
            tooltip.removeEventListener('transitionend', handleTransitionEnd);
        };
    }, [state.visible]);

    const tooltipStyle: React.CSSProperties = {
        position: 'fixed',
        pointerEvents: 'auto',
        opacity: state.visible ? 1 : 0,
        transition: `opacity ${fadeTransition}ms ease-in-out`,
        zIndex: state.zIndex,
        backgroundColor: '#337AB7',
        fontSize: '13px',
        color: '#fff',
        padding: '9px 11px',
        border: '1px solid transparent',
        borderRadius: '3px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
    };

    return createPortal(
        <div
            ref={tooltipRef}
            className="trace-compass-tooltip"
            style={tooltipStyle}
            onMouseEnter={() => {
                isMouseOverRef.current = true;
            }}
            onMouseLeave={() => {
                isMouseOverRef.current = false;
                setState(prev => ({ ...prev, visible: false }));
            }}
        >
            {state.content}
        </div>,
        document.body
    );
};
