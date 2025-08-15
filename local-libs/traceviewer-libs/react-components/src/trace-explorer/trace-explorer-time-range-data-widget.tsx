import * as React from 'react';
import { TimeRangeUpdatePayload } from 'traceviewer-base/lib/signals/time-range-data-signal-payloads';
import { TimeRangeDataMap } from '../components/utils/time-range-data-map';
import { signalManager } from 'traceviewer-base/lib/signals/signal-manager';
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
    userInputSelectionStart?: string;
    userInputSelectionEnd?: string;
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
    private experimentDataMap: TimeRangeDataMap;

    constructor(props: ReactTimeRangeDataWidgetProps) {
        super(props);
        this.experimentDataMap = new TimeRangeDataMap();
        this.state = {
            inputting: false,
            userInputSelectionStartIsValid: true,
            userInputSelectionEndIsValid: true
        };
        this.subscribeToEvents();
    }

    private subscribeToEvents = (): void => {
        signalManager().on('VIEW_RANGE_UPDATED', this.onViewRangeUpdated);
        signalManager().on('SELECTION_RANGE_UPDATED', this.onSelectionRangeUpdated);
        signalManager().on('EXPERIMENT_SELECTED', this.onExperimentSelected);
        signalManager().on('EXPERIMENT_UPDATED', this.onExperimentUpdated);
        signalManager().on('EXPERIMENT_CLOSED', this.onExperimentClosed);
        signalManager().on('CLOSE_TRACEVIEWERTAB', this.onExperimentClosed);
    };

    public componentWillUnmount = (): void => {
        signalManager().off('VIEW_RANGE_UPDATED', this.onViewRangeUpdated);
        signalManager().off('SELECTION_RANGE_UPDATED', this.onSelectionRangeUpdated);
        signalManager().off('EXPERIMENT_SELECTED', this.onExperimentSelected);
        signalManager().off('EXPERIMENT_UPDATED', this.onExperimentUpdated);
        signalManager().off('EXPERIMENT_CLOSED', this.onExperimentClosed);
        signalManager().off('CLOSE_TRACEVIEWERTAB', this.onExperimentClosed);
    };

    private onViewRangeUpdated = (payload: TimeRangeUpdatePayload): void => {
        this.experimentDataMap.updateViewRange(payload);
        this.renderIfActive();
    };

    private onSelectionRangeUpdated = (payload: TimeRangeUpdatePayload): void => {
        this.experimentDataMap.updateSelectionRange(payload);
        this.renderIfActive();
    };

    private onAbsoluteRangeUpdate = (experiment: Experiment): void => {
        this.experimentDataMap.updateAbsoluteRange(experiment);
        this.renderIfActive();
    };

    private onExperimentUpdated = (experiment: Experiment): void => {
        this.onAbsoluteRangeUpdate(experiment);
        this.renderIfActive();
    };

    private onExperimentSelected = (experiment: Experiment | undefined): void => {
        let newActiveData;
        if (experiment) {
            // TODO - consider changing this logic?
            this.onAbsoluteRangeUpdate(experiment);
            newActiveData = this.experimentDataMap.get(experiment.UUID);
        }
        this.setActiveExperiment(newActiveData);
    };

    private onExperimentClosed = (experiment: Experiment | string): void => {
        this.experimentDataMap.delete(experiment);
    };

    private setActiveExperiment = (timeData?: ExperimentTimeRangeData): void => {
        this.experimentDataMap.setActiveExperiment(timeData);
        this.setState({ activeData: timeData ? this.experimentDataMap.get(timeData.UUID) : undefined });
    };

    private renderIfActive(): void {
        const { state, experimentDataMap } = this;
        if (state.activeData?.UUID === experimentDataMap.activeData?.UUID) {
            const activeData = state.activeData ? experimentDataMap.get(state.activeData.UUID) : undefined;
            this.setState({ activeData });
        }
    }

    public restoreData = (mapArray: Array<ExperimentTimeRangeData>, activeData: ExperimentTimeRangeData): void => {
        this.experimentDataMap.clear();
        for (const experimentData of mapArray) {
            this.experimentDataMap.set(experimentData);
        }
        this.setActiveExperiment(activeData);
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

        switch (inputIndex) {
            case 0:
                this.setState({ userInputSelectionStart: event.currentTarget.value });
                return;
            case 1:
                this.setState({ userInputSelectionEnd: event.currentTarget.value });
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

        const offset = BigInt(this.state.activeData?.absoluteRange?.start || 0);
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

        // Set empty strings to undefined
        userInputSelectionStart = userInputSelectionStart === '' ? undefined : userInputSelectionStart;
        userInputSelectionEnd = userInputSelectionEnd === '' ? undefined : userInputSelectionEnd;

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

        // If there is no user input for start or end, set that value to the current selectionRange value.
        const { start: currentStart, end: currentEnd } = this.getStartAndEnd(
            selectionRange?.start,
            selectionRange?.end
        );
        const selectionStart = BigInt(userInputSelectionStart || currentStart);
        const selectionEnd = BigInt(userInputSelectionEnd || currentEnd);

        // Now we can validate
        const isValid = (n: bigint): boolean => n >= offset && n <= traceEndTime;
        const startValid = isValid(selectionStart);
        const endValid = isValid(selectionEnd);

        if (startValid && endValid) {
            this.reset();
            const start = selectionStart - offset;
            const end = selectionEnd - offset;
            signalManager().emit('REQUEST_SELECTION_RANGE_CHANGE', {
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
                        <div className={userInputSelectionStartIsValid ? sectionClassName : errorClassName}>
                            <label htmlFor="selectionRangeStart">
                                <h4 className="outputs-element-name">
                                    {userInputSelectionStartIsValid
                                        ? 'Selection Range Start:'
                                        : '* Selection Range Start:'}
                                </h4>
                            </label>
                            <input
                                type="number"
                                value={
                                    typeof userInputSelectionStart === 'string'
                                        ? userInputSelectionStart
                                        : selectionRangeStart
                                }
                                onChange={e => this.onChange(e, 0)}
                            />
                        </div>
                        <div className={userInputSelectionEndIsValid ? sectionClassName : errorClassName}>
                            <label htmlFor="selectionRangeEnd">
                                <h4 className="outputs-element-name">
                                    {userInputSelectionEndIsValid ? 'Selection Range End:' : '* Selection Range End:'}
                                </h4>
                            </label>
                            <input
                                type="number"
                                value={
                                    typeof userInputSelectionEnd === 'string'
                                        ? userInputSelectionEnd
                                        : selectionRangeEnd
                                }
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
