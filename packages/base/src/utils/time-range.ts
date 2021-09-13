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
    constructor(start: bigint, end: bigint, offset?: bigint) {
        this.start = start;
        this.end = end;
        this.offset = offset;
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
}
