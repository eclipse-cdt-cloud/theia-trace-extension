/***************************************************************************************
 * Copyright (c) 2024 BlackBerry Limited and contributors.
 *
 * Licensed under the MIT license. See LICENSE file in the project root for details.
 ***************************************************************************************/
/* eslint-disable @typescript-eslint/no-explicit-any */
export class RowSelectionsChangedSignalPayload {
    private traceId: string;
    private outputDescriptorId: string;
    private rows: { id: number; parentId?: number; metadata?: { [key: string]: any } }[];

    constructor(
        traceId: string,
        descriptorId: string,
        rows: { id: number; parentId?: number; metadata?: { [key: string]: any } }[]
    ) {
        this.outputDescriptorId = descriptorId;
        this.traceId = traceId;
        this.rows = rows;
    }

    public getOutputDescriptorId(): string {
        return this.outputDescriptorId;
    }

    public getTraceId(): string {
        return this.traceId;
    }

    public getRows(): { id: number; parentId?: number; metadata?: { [key: string]: any } }[] {
        return this.rows;
    }
}
