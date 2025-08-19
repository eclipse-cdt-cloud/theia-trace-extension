export interface TimeRangeString {
    start: string;
    end: string;
    offset?: string;
}

export class TimeRange {
    private start: bigint;
    private end: bigint;
    private offset: bigint | undefined;

    /**
     * Constructor.
     * @param start Range start time
     * @param end Range end time
     * @param offset Time offset, if this is defined the start and end time should be relative to this value
     */
    constructor(start: bigint, end: bigint, offset?: bigint);
    /**
     * Constructor.
     * @param timeRangeString string object returned by this.toString()
     */
    constructor(timeRangeString: TimeRangeString);
    /**
     * Constructor.
     * Default TimeRange with 0 for values
     */
    constructor();
    constructor(a?: TimeRangeString | bigint, b?: bigint, c?: bigint) {
        if (typeof a === 'bigint' && typeof b === 'bigint') {
            this.start = a;
            this.end = b;
            this.offset = c;
        } else if (typeof a === 'object') {
            const timeRangeString: TimeRangeString = a;
            const { start, end, offset } = timeRangeString;
            this.start = BigInt(start);
            this.end = BigInt(end);
            this.offset = offset ? BigInt(offset) : undefined;
        } else {
            this.start = BigInt(0);
            this.end = BigInt(0);
            this.offset = undefined;
        }
    }

    /**
     * Get the range start time.
     * If an offset is present the return value is start + offset.
     */
    public getStart(): bigint {
        if (this.offset !== undefined) {
            return this.start + this.offset;
        }
        return this.start;
    }

    /**
     * Get the range end time.
     * If an offset is present the return value is end + offset.
     */
    public getEnd(): bigint {
        if (this.offset !== undefined) {
            return this.end + this.offset;
        }
        return this.end;
    }

    /**
     * Get range duration
     */
    public getDuration(): bigint {
        return this.end - this.start;
    }

    /**
     * Return the time offset
     */
    public getOffset(): bigint | undefined {
        return this.offset;
    }

    /**
     * Create a string object that can be JSON.stringified
     */
    public toString(): TimeRangeString {
        return {
            start: this.start.toString(),
            end: this.end.toString(),
            offset: this.offset?.toString()
        };
    }
}
