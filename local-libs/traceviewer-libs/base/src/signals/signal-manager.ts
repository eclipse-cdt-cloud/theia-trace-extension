import { EventEmitter } from 'events';
import { OutputDescriptor } from 'tsp-typescript-client';
import { Experiment } from 'tsp-typescript-client/lib/models/experiment';
import { Trace } from 'tsp-typescript-client/lib/models/trace';
import { OpenedTracesUpdatedSignalPayload } from './opened-traces-updated-signal-payload';
import { OutputAddedSignalPayload } from './output-added-signal-payload';
import { TimeRangeUpdatePayload } from './time-range-data-signal-payloads';
import { ContextMenuContributedSignalPayload } from './context-menu-contributed-signal-payload';
import { ContextMenuItemClickedSignalPayload } from './context-menu-item-clicked-signal-payload';
import { RowSelectionsChangedSignalPayload } from './row-selections-changed-signal-payload';
import { ItemPropertiesSignalPayload } from './item-properties-signal-payload';

export interface Signals {
    TRACE_OPENED: [trace: Trace];
    TRACE_DELETED: [payload: { trace: Trace }];
    EXPERIMENT_OPENED: [experiment: Experiment];
    EXPERIMENT_CLOSED: [experiment: Experiment];
    EXPERIMENT_DELETED: [experiment: Experiment];
    EXPERIMENT_SELECTED: [experiment: Experiment | undefined];
    EXPERIMENT_UPDATED: [experiment: Experiment];
    OPENED_TRACES_UPDATED: [payload: OpenedTracesUpdatedSignalPayload];
    AVAILABLE_OUTPUTS_CHANGED: void;
    OUTPUT_ADDED: [payload: OutputAddedSignalPayload];
    ITEM_PROPERTIES_UPDATED: [payload: ItemPropertiesSignalPayload];
    THEME_CHANGED: [theme: string];
    SELECTION_CHANGED: [payload: { [key: string]: string }];
    ROW_SELECTIONS_CHANGED: [payload: RowSelectionsChangedSignalPayload];
    CLOSE_TRACEVIEWERTAB: [traceUUID: string];
    TRACEVIEWERTAB_ACTIVATED: [experiment: Experiment];
    UPDATE_ZOOM: [hasZoomedIn: boolean];
    RESET_ZOOM: void;
    MARKER_CATEGORIES_FETCHED: void;
    MARKERSETS_FETCHED: void;
    MARKER_CATEGORY_CLOSED: [traceViewerId: string, markerCategory: string];
    TRACE_SERVER_STARTED: void;
    UNDO: void;
    REDO: void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    PIN_VIEW: [output: OutputDescriptor, extra?: any];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    UNPIN_VIEW: [output: OutputDescriptor, extra?: any];
    OPEN_OVERVIEW_OUTPUT: [traceId: string];
    OVERVIEW_OUTPUT_SELECTED: [traceId: string, outputDescriptor: OutputDescriptor];
    SAVE_AS_CSV: [traceId: string, data: string];
    VIEW_RANGE_UPDATED: [payload: TimeRangeUpdatePayload];
    SELECTION_RANGE_UPDATED: [payload: TimeRangeUpdatePayload];
    REQUEST_SELECTION_RANGE_CHANGE: [payload: TimeRangeUpdatePayload];
    OUTPUT_DATA_CHANGED: [descriptors: OutputDescriptor[]];
    CONTRIBUTE_CONTEXT_MENU: [payload: ContextMenuContributedSignalPayload];
    CONTEXT_MENU_ITEM_CLICKED: [payload: ContextMenuItemClickedSignalPayload];
}

export type SignalType = keyof Signals;
export type SignalArgs<T> = T extends void ? [] : T;

export class SignalManager extends EventEmitter {
    /**
     * Registers an event handler for a specific signal type.
     * Provides type-safe event registration with correct payload types for each signal.
     *
     * @template K - The signal type (key of Signals interface)
     * @param event - The event name to listen for
     * @param listener - The callback function to execute when the event occurs
     *                  Type of arguments is automatically inferred from Signals interface
     * @returns The signal manager instance for chaining
     *
     * @example
     * // Single argument event
     * signalManager().on('THEME_CHANGED', (theme: string) => {
     *   console.log(`Theme changed to: ${theme}`);
     * });
     *
     * // Tuple argument event
     * signalManager().on('PIN_VIEW', (output: OutputDescriptor, extra?: any) => {
     *   console.log(`Pinning view for output: ${output.id}`);
     * });
     */
    on<K extends SignalType>(
        event: K,
        listener: (
            ...args: SignalArgs<Signals[K]> extends [] ? [] : [...SignalArgs<Signals[K]>]
        ) => void | Promise<void>
    ): this {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return super.on(event, listener as (...args: any[]) => void | Promise<void>);
    }

    /**
     * Removes an event handler for a specific signal type.
     * Ensures type safety by requiring the listener signature to match the signal type.
     *
     * @template K - The signal type (key of Signals interface)
     * @param event - The event name to remove the listener from
     * @param listener - The callback function to remove
     * @returns The signal manager instance for chaining
     *
     * @example
     * const themeHandler = (theme: string) => console.log(theme);
     * signalManager().off('THEME_CHANGED', themeHandler);
     */
    off<K extends SignalType>(
        event: K,
        listener: (
            ...args: SignalArgs<Signals[K]> extends [] ? [] : [...SignalArgs<Signals[K]>]
        ) => void | Promise<void>
    ): this {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return super.off(event, listener as (...args: any[]) => void | Promise<void>);
    }

    /**
     * Emits a signal with type-safe arguments based on the signal type.
     * Arguments are automatically validated against the Signals interface.
     *
     * @template K - The signal type (key of Signals interface)
     * @param event - The event name to emit
     * @param args - The arguments to pass to listeners, type checked against Signals interface
     * @returns true if the event had listeners, false otherwise
     *
     * @example
     * // Single argument emission
     * signalManager().emit('THEME_CHANGED', 'dark');
     *
     * // Tuple argument emission
     * signalManager().emit('MARKER_CATEGORY_CLOSED', 'viewer1', 'category1');
     *
     * // Void event emission
     * signalManager().emit('RESET_ZOOM');
     */
    emit<K extends SignalType>(
        event: K,
        ...args: SignalArgs<Signals[K]> extends [] ? [] : [...SignalArgs<Signals[K]>]
    ): boolean {
        return super.emit(event, ...args);
    }
}

let instance: SignalManager = new SignalManager();

export const setSignalManagerInstance = (sm: SignalManager): void => {
    instance = sm;
};

export const signalManager = (): SignalManager => instance;
