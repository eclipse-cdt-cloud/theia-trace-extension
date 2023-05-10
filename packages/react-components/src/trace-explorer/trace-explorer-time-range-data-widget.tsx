import * as React from 'react';
import { TimeRangeUpdatePayload } from 'traceviewer-base/lib/signals/time-range-data-signal-payloads';
import { signalManager, Signals } from 'traceviewer-base/lib/signals/signal-manager';
import { Experiment } from 'tsp-typescript-client';
import { TimeRange } from 'traceviewer-base/lib/utils/time-range';

export interface ReactTimeRangeDataWidgetProps {
    id: string;
    title: string;
}

export interface ReactTimeRangeDataWidgetState {
    activeData?: ExperimentTimeRangeData;
    userInputSelectionStartIsValid: boolean;
    userInputSelectionEndIsValid: boolean;
    userInputSelectionStart?: bigint;
    userInputSelectionEnd?: bigint;
    inputting: boolean;
}

export interface ExperimentTimeRangeData {
    UUID: string;
    // We need to make below values possibly undefined because
    // they come in at different times from different signals
    // when an experiment is selected.
    absoluteRange?: { start: bigint; end: bigint };
    viewRange?: { start: bigint; end: bigint };
    selectionRange?: { start: bigint; end: bigint };
}

export class ReactTimeRangeDataWidget extends React.Component<
    ReactTimeRangeDataWidgetProps,
    ReactTimeRangeDataWidgetState
> {
    private experimentDataMap: Map<string, ExperimentTimeRangeData>;

    constructor(props: ReactTimeRangeDataWidgetProps) {
        super(props);
        this.experimentDataMap = new Map<string, ExperimentTimeRangeData>();
        this.state = {
            inputting: false,
            userInputSelectionStartIsValid: true,
            userInputSelectionEndIsValid: true
        };
        this.subscribeToEvents();
    }

    private subscribeToEvents = (): void => {
        signalManager().on(Signals.VIEW_RANGE_UPDATED, this.onViewRangeUpdated);
        signalManager().on(Signals.SELECTION_RANGE_UPDATED, this.onSelectionRangeUpdated);
        signalManager().on(Signals.EXPERIMENT_SELECTED, this.onExperimentSelected);
        signalManager().on(Signals.EXPERIMENT_UPDATED, this.onExperimentUpdated);
        signalManager().on(Signals.EXPERIMENT_CLOSED, this.onExperimentClosed);
    };

    public componentWillUnmount = (): void => {
        signalManager().off(Signals.VIEW_RANGE_UPDATED, this.onViewRangeUpdated);
        signalManager().off(Signals.SELECTION_RANGE_UPDATED, this.onSelectionRangeUpdated);
        signalManager().off(Signals.EXPERIMENT_SELECTED, this.onExperimentSelected);
        signalManager().off(Signals.EXPERIMENT_UPDATED, this.onExperimentUpdated);
        signalManager().off(Signals.EXPERIMENT_CLOSED, this.onExperimentClosed);
    };

    private onViewRangeUpdated = (payload: TimeRangeUpdatePayload): void => {
        const { experimentUUID: UUID, timeRange } = payload;

        const update = {
            UUID,
            viewRange: timeRange
        } as ExperimentTimeRangeData;

        this.updateExperimentTimeRangeData(update);
    };

    private onSelectionRangeUpdated = (payload: TimeRangeUpdatePayload): void => {
        const { experimentUUID: UUID, timeRange } = payload;

        const update = {
            UUID,
            selectionRange: timeRange
        } as ExperimentTimeRangeData;

        this.updateExperimentTimeRangeData(update);
    };

    private onAbsoluteRangeUpdate = (experiment: Experiment): void => {
        if (!experiment) {
            return;
        }

        const { UUID, start, end } = experiment;

        const update = {
            UUID,
            absoluteRange: {
                start,
                end
            }
        } as ExperimentTimeRangeData;

        this.updateExperimentTimeRangeData(update);
    };

    /**
     * Updates the data stored in experimentDataMap.  Works similar to setState() where
     * you only input the data to change and the existing values persist.
     * @param data Partial data of Experiment Time Range Data.
     */
    private updateExperimentTimeRangeData = (data: ExperimentTimeRangeData): void => {
        const map = this.experimentDataMap;
        const id = data.UUID;
        const existingData = map.get(id) || {};
        const newData = {
            ...existingData,
            ...data
        };
        map.set(id, newData);

        // If the experiment is currently displayed, we need to render it
        if (id === this.state.activeData?.UUID) {
            this.setState({ activeData: newData });
        }
    };

    private onExperimentUpdated = (experiment: Experiment | undefined): void => {
        if (experiment) {
            this.onAbsoluteRangeUpdate(experiment);
        }
    };

    private onExperimentSelected = (experiment: Experiment | undefined): void => {
        if (experiment) {
            this.onAbsoluteRangeUpdate(experiment);
            const newActiveData = this.experimentDataMap.get(experiment.UUID);
            this.setState({ activeData: newActiveData });
        }
    };

    private onExperimentClosed = (experiment: Experiment): void => {
        const id = experiment.UUID;
        this.experimentDataMap.delete(id);

        if (id === this.state.activeData?.UUID) {
            this.setState({ activeData: undefined });
        }
    };

    private reset = (): void => {
        this.setState({
            userInputSelectionEndIsValid: true,
            userInputSelectionStartIsValid: true,
            userInputSelectionEnd: undefined,
            userInputSelectionStart: undefined,
            inputting: false
        });
    };

    private onChange = (event: React.FormEvent<HTMLInputElement>, inputIndex: number): void => {
        event.preventDefault();
        if (!this.state.inputting) {
            this.setState({ inputting: true });
        }

        // BigInt("") => 0 but we want that to be undefined.
        const value = event.currentTarget.value === '' ? undefined : BigInt(event.currentTarget.value);

        switch (inputIndex) {
            case 0:
                this.setState({ userInputSelectionStart: value });
                return;
            case 1:
                this.setState({ userInputSelectionEnd: value });
                return;
            default:
                throw Error('Input index is invalid!');
        }
    };

    private onSubmit = (event: React.FormEvent): void => {
        event.preventDefault();
        this.verifyUserInput();
    };

    /**
     *
     * Sometimes the unitController's selection range has a start that's larger than the end (they're reversed).
     * This always sets the lesser number as the start.
     * @param value1
     * @param value2
     * @returns { start: string, end: string }
     */
    private getStartAndEnd = (
        v1: bigint | string | undefined,
        v2: bigint | string | undefined
    ): { start: string; end: string } => {
        if (v1 === undefined || v2 === undefined) {
            return { start: '', end: '' };
        }

        v1 = BigInt(v1);
        v2 = BigInt(v2);

        const offset = this.state.activeData?.absoluteRange?.start || BigInt(0);

        const reverse = v1 > v2;
        const start = reverse ? v2 : v1;
        const end = reverse ? v1 : v2;

        // We display values in absolute time with the offset.
        return {
            start: (start + offset).toString(),
            end: (end + offset).toString()
        };
    };

    private verifyUserInput = (): void => {
        let { activeData, userInputSelectionStart, userInputSelectionEnd } = this.state;

        // We need at least one value to change: start or end.
        const noUserInput =
            typeof userInputSelectionStart === 'undefined' && typeof userInputSelectionEnd === 'undefined';
        if (!activeData || noUserInput) {
            this.reset();
            return;
        }

        const { absoluteRange, selectionRange } = activeData;
        // We have to use default values for data from "activeData" because of the (TimeRange | undefined) type definition
        // but these are only to satisfy the compiler.  Most of the time these are defined.
        const offset = absoluteRange?.start || BigInt('0');
        const traceEndTime = absoluteRange?.end || BigInt('0');

        // If there is no pre-existing selection range and the user only inputs one value
        // That one value needs to be both the start and end value.
        if (!selectionRange && (!userInputSelectionEnd || !userInputSelectionStart)) {
            userInputSelectionStart = userInputSelectionStart || userInputSelectionEnd;
            userInputSelectionEnd = userInputSelectionEnd || userInputSelectionStart;
        }

        // If there is no user input for start or end, set that value to the current selectionRange value.
        const { start: currentStart, end: currentEnd } = this.getStartAndEnd(
            selectionRange?.start,
            selectionRange?.end
        );
        userInputSelectionStart =
            typeof userInputSelectionStart === 'bigint' ? userInputSelectionStart : BigInt(currentStart);
        userInputSelectionEnd = typeof userInputSelectionEnd === 'bigint' ? userInputSelectionEnd : BigInt(currentEnd);

        // Now we can validate
        const isValid = (n: bigint): boolean => n >= offset && n <= traceEndTime;
        const startValid = isValid(userInputSelectionStart);
        const endValid = isValid(userInputSelectionEnd);

        if (startValid && endValid) {
            this.reset();
            const start = userInputSelectionStart - offset;
            const end = userInputSelectionEnd - offset;
            signalManager().fireRequestSelectionRangeChange({
                experimentUUID: activeData.UUID,
                timeRange: new TimeRange(start, end)
            });
        } else {
            this.setState({
                userInputSelectionStartIsValid: startValid,
                userInputSelectionEndIsValid: endValid
            });
        }
    };

    public render(): React.ReactNode {
        const {
            activeData,
            inputting,
            userInputSelectionStartIsValid,
            userInputSelectionEndIsValid,
            userInputSelectionStart,
            userInputSelectionEnd
        } = this.state;

        const viewRange = activeData?.viewRange;
        const selectionRange = activeData?.selectionRange;

        const sectionClassName = 'view-range-widget-section';
        const errorClassName = `${sectionClassName} invalid-input`;

        const { start: viewRangeStart, end: viewRangeEnd } = this.getStartAndEnd(viewRange?.start, viewRange?.end);
        const { start: selectionRangeStart, end: selectionRangeEnd } = this.getStartAndEnd(
            selectionRange?.start,
            selectionRange?.end
        );

        const startValid = inputting ? userInputSelectionStartIsValid : true;
        const endValid = inputting ? userInputSelectionEndIsValid : true;

        return (
            <div className="trace-explorer-item-properties">
                <div className="trace-explorer-panel-content">
                    <form onSubmit={this.onSubmit}>
                        {(!startValid || !endValid) && (
                            <div className={errorClassName}>
                                <label htmlFor="errorMessage">
                                    <h4 className="outputs-element-name">
                                        <i>Invalid Values</i>
                                    </h4>
                                </label>
                            </div>
                        )}
                        <div className={sectionClassName}>
                            <label htmlFor="viewRangeStart">
                                <h4 className="outputs-element-name">View Range Start:</h4>
                                {viewRangeStart}
                            </label>
                        </div>
                        <div className={sectionClassName}>
                            <label htmlFor="viewRangeEnd">
                                <h4 className="outputs-element-name">View Range End:</h4>
                                {viewRangeEnd}
                            </label>
                        </div>
                        <div className={startValid ? sectionClassName : errorClassName}>
                            <label htmlFor="selectionRangeStart">
                                <h4 className="outputs-element-name">
                                    {userInputSelectionStartIsValid
                                        ? 'Selection Range Start:'
                                        : '* Selection Range Start:'}
                                </h4>
                            </label>
                            <input
                                type="number"
                                value={userInputSelectionStart?.toString() || selectionRangeStart}
                                onChange={e => this.onChange(e, 0)}
                            />
                        </div>
                        <div className={endValid ? sectionClassName : errorClassName}>
                            <label htmlFor="selectionRangeEnd">
                                <h4 className="outputs-element-name">
                                    {endValid ? 'Selection Range End:' : '* Selection Range End:'}
                                </h4>
                            </label>
                            <input
                                type="number"
                                value={userInputSelectionEnd?.toString() || selectionRangeEnd}
                                onChange={e => this.onChange(e, 1)}
                            />
                        </div>
                        {inputting && (
                            <div className={sectionClassName}>
                                <input className="input-button" type="submit" value="Submit" />
                                <input className="input-button" type="button" onClick={this.reset} value="Cancel" />
                            </div>
                        )}
                    </form>
                </div>
            </div>
        );
    }
}
