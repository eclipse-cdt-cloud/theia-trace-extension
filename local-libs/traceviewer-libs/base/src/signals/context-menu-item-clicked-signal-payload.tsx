/***************************************************************************************
 * Copyright (c) 2024 BlackBerry Limited and contributors.
 *
 * Licensed under the MIT license. See LICENSE file in the project root for details.
 ***************************************************************************************/
/* eslint-disable @typescript-eslint/no-explicit-any */
export class ContextMenuItemClickedSignalPayload {
    private outputDescriptorId: string;
    private itemId: string;
    private parentMenuId: string | undefined;
    private props: { [key: string]: any };

    constructor(descriptorId: string, itemId: string, props: { [key: string]: any }, parentMenuId?: string) {
        this.outputDescriptorId = descriptorId;
        this.itemId = itemId;
        this.props = props;
        this.parentMenuId = parentMenuId;
    }

    public getOutputDescriptorId(): string {
        return this.outputDescriptorId;
    }

    public getItemId(): string {
        return this.itemId;
    }

    public getProps(): { [key: string]: any } {
        return this.props;
    }

    public getParentMenuId(): string | undefined {
        return this.parentMenuId;
    }
}
