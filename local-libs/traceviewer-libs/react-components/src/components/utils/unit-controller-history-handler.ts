import { TimelineChart } from 'timeline-chart/lib/time-graph-model';
import { TimeGraphUnitController } from 'timeline-chart/lib/time-graph-unit-controller';

export interface HistoryItem {
    selectionRange: TimelineChart.TimeGraphRange | undefined;
    viewRange: TimelineChart.TimeGraphRange;
}

export class UnitControllerHistoryHandler {
    protected history: Array<HistoryItem>;
    protected index = 0;
    protected maxAllowedIndex = 0;
    protected timeout?: ReturnType<typeof setTimeout>;
    protected unitController: TimeGraphUnitController;
    protected restoring = false;

    constructor(uC: TimeGraphUnitController) {
        this.history = [];
        this.unitController = uC;
    }

    public addCurrentState(): void {
        const { selectionRange, viewRange } = this.unitController;
        this.enqueueItem({ selectionRange, viewRange });
    }

    public undo(): void {
        if (this.canUndo) {
            this.index--;
            this.restore();
        }
    }

    public redo(): void {
        if (this.canRedo) {
            this.index++;
            this.restore();
        }
    }

    public clear(): void {
        this.index = 0;
        this.maxAllowedIndex = 0;
    }

    private enqueueItem(item: HistoryItem): void {
        /**
         * Since scrolling with the scroll-bar or dragging handle triggers many changes per second
         * we don't want to actually push if another request comes in quick succession.
         *
         * Don't add anything if we are currently restoring.
         */
        if (this.restoring) {
            return;
        }
        if (this.timeout) {
            clearTimeout(this.timeout);
        }
        this.timeout = setTimeout(() => this.add(item), 500);
    }

    private add(item: HistoryItem): void {
        const isDuplicate = this.isEntryDuplicate(item);
        if (!isDuplicate) {
            this.index++;
            this.maxAllowedIndex = this.index;
            this.history[this.index] = item;
        }
    }

    private restore(): void {
        this.restoring = true;
        const { selectionRange, viewRange } = this.history[this.index];
        this.unitController.selectionRange = selectionRange;
        this.unitController.viewRange = viewRange;
        setTimeout(() => (this.restoring = false), 500);
    }

    private isEntryDuplicate(item: HistoryItem): boolean {
        // Checks if stack entry is same as previous entry.
        if (this.index === 0) {
            return false;
        }
        let oneIsDifferent = false;
        const { selectionRange: itemSR, viewRange: itemVR } = item;
        const { selectionRange: prevSR, viewRange: prevVR } = this.history[this.index];
        const check = (value1: BigInt | undefined, value2: BigInt | undefined) => {
            if (oneIsDifferent) {
                return;
            }
            oneIsDifferent = value1 !== value2;
        };
        check(itemSR?.start, prevSR?.start);
        check(itemSR?.end, prevSR?.end);
        check(itemVR.start, prevVR.start);
        check(itemVR.end, prevVR.end);
        return !oneIsDifferent;
    }

    private get canRedo(): boolean {
        return this.index < this.maxAllowedIndex;
    }

    private get canUndo(): boolean {
        return this.index > 1;
    }
}
