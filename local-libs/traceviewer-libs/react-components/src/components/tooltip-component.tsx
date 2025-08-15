import * as React from 'react';
import { createPortal } from 'react-dom';
import { debounce } from 'lodash';

interface TooltipProps {
    content?: React.ReactNode;
    visible?: boolean;
    fadeTransition?: number;
}

interface TooltipState {
    content: React.ReactNode;
    visible: boolean;
    zIndex: number;
    left: number;
    top: number;
}

export class TooltipComponent extends React.Component<TooltipProps, TooltipState> {
    public static defaultProps = {
        content: '⏳',
        visible: false,
        fadeTransition: 500
    };

    private tooltipRef: React.RefObject<HTMLDivElement>;
    private lastMousePosition: { x: number; y: number };
    private isMouseOver: boolean;
    private debouncedUpdate: ReturnType<typeof debounce>;

    constructor(props: TooltipProps) {
        super(props);

        this.tooltipRef = React.createRef();
        this.lastMousePosition = { x: 0, y: 0 };
        this.isMouseOver = false;

        this.state = {
            content: props.content,
            visible: props.visible || false,
            zIndex: props.visible || false ? 99999 : -99999,
            left: 0,
            top: 0
        };

        this.debouncedUpdate = debounce(this.updateState, 500);
    }

    public componentDidMount(): void {
        // Track mouse position and detect when mouse leaves viewport
        document.addEventListener('mousemove', this.handleMouseMove);
        document.addEventListener('mouseleave', this.handleMouseLeave);

        // Hide tooltip when scrolling (use capture to catch all scroll events)
        window.addEventListener('scroll', this.handleScroll, { capture: true });
        document.addEventListener('scroll', this.handleScroll, { capture: true });

        // Handle transition end for z-index updates
        if (this.tooltipRef.current) {
            this.tooltipRef.current.addEventListener('transitionend', this.handleTransitionEnd);
        }
    }

    public componentDidUpdate(prevProps: TooltipProps): void {
        // Handle content and visibility changes
        if (
            !this.isMouseOver && // If we're not hovering
            (prevProps.content !== this.props.content || prevProps.visible !== this.props.visible) // And if content or visibility is changing
        ) {
            this.debouncedUpdate({
                content: this.props.content,
                visible: this.props.visible
            });
        }
    }

    public componentWillUnmount(): void {
        // Cleanup event listeners
        document.removeEventListener('mousemove', this.handleMouseMove);
        document.removeEventListener('mouseleave', this.handleMouseLeave);
        window.removeEventListener('scroll', this.handleScroll, { capture: true });
        document.removeEventListener('scroll', this.handleScroll, { capture: true });

        if (this.tooltipRef.current) {
            this.tooltipRef.current.removeEventListener('transitionend', this.handleTransitionEnd);
        }

        // Cancel debounced function
        this.debouncedUpdate.cancel();
    }

    public render(): React.ReactPortal {
        const tooltipStyle: React.CSSProperties = {
            position: 'fixed',
            pointerEvents: 'auto',
            opacity: this.state.visible ? 1 : 0,
            transition: `opacity ${this.props.fadeTransition}ms ease-in-out`,
            zIndex: this.state.zIndex,
            backgroundColor: '#337AB7',
            fontSize: '13px',
            color: '#fff',
            padding: '9px 11px',
            border: '1px solid transparent',
            borderRadius: '3px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            left: `${this.state.left}px`,
            top: `${this.state.top}px`
        };

        return createPortal(
            <div
                ref={this.tooltipRef}
                className="trace-compass-tooltip"
                style={tooltipStyle}
                onMouseEnter={this.handleTooltipMouseEnter}
                onMouseLeave={this.handleTooltipMouseLeave}
            >
                {this.state.content}
            </div>,
            document.body
        );
    }

    private calculateAndSetPosition = (): { top: number; left: number } => {
        if (!this.tooltipRef.current) {
            throw new Error('No tooltip rendered to set position.');
        }

        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const tooltipRect = this.tooltipRef.current.getBoundingClientRect();

        let left = this.lastMousePosition.x + 10;
        let top = this.lastMousePosition.y + 10;

        if (left + tooltipRect.width > viewportWidth) {
            left = this.lastMousePosition.x - tooltipRect.width - 10;
        }

        if (top + tooltipRect.height > viewportHeight) {
            top = this.lastMousePosition.y - tooltipRect.height - 10;
        }

        this.setState({ left, top });
        return { left, top };
    };

    /**
     * Updates the tooltip state with special handling for different scenarios.
     *
     * This method is debounced to prevent rapid state changes and handles several edge cases:
     * 1. If mouse is over the tooltip, cancels the update to prevent hiding while user is interacting
     * 2. When hiding the tooltip, maintains content and z-index during fade-out animation
     * 3. When showing the tooltip, updates position and immediately sets z-index to visible
     * 4. When changing content, remove user selected text (fixes a weird bug)
     *
     * @param newState - Partial state update to be applied
     */
    private updateState = (newState: Partial<TooltipState>): void => {
        const currentState = this.state;
        const updatedState = { ...currentState, ...newState };

        const weAreHidingTooltip = currentState.visible === true && newState.visible === false;
        const textIsChanging = currentState.content !== newState.content;

        if (this.isMouseOver) {
            this.debouncedUpdate.cancel();
            return;
        }

        if (weAreHidingTooltip) {
            // Don't update the content
            updatedState.content = currentState.content;
            // Keep z-index high during fade out
            updatedState.zIndex = currentState.zIndex;
            this.setState(updatedState);
            return;
        }

        if (textIsChanging) {
            this.clearSelection();
        }

        // Update position before showing
        const { top, left } = this.calculateAndSetPosition();
        // Update the position here so it doesn't move back
        updatedState.top = top;
        updatedState.left = left;

        // Update z-index immediately when showing
        if (newState.visible) {
            updatedState.zIndex = 99999;
        }

        this.setState(updatedState);
    };

    private handleMouseMove = (e: MouseEvent): void => {
        this.lastMousePosition = { x: e.clientX, y: e.clientY };
    };

    private handleMouseLeave = (e: MouseEvent): void => {
        // Check if the mouse has actually left the viewport
        if (e.clientY <= 0 || e.clientY >= window.innerHeight || e.clientX <= 0 || e.clientX >= window.innerWidth) {
            this.setState({ visible: false });
        }
    };

    private handleScroll = (): void => {
        this.setState({
            visible: false
        });
    };

    private handleTransitionEnd = (e: TransitionEvent): void => {
        if (e.propertyName === 'opacity' && !this.state.visible) {
            this.setState({ zIndex: -99999 });
        }
    };

    private handleTooltipMouseEnter = (): void => {
        this.isMouseOver = true;
    };

    private handleTooltipMouseLeave = (): void => {
        this.isMouseOver = false;
        this.setState({ visible: false });
    };

    private clearSelection = (): void => {
        const selection = window.getSelection();
        if (selection) {
            if (selection.empty) {
                // Chrome, Safari, Opera
                selection.empty();
            } else if (selection.removeAllRanges) {
                // Firefox
                selection.removeAllRanges();
            }
        }
    };
}
