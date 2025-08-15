/***************************************************************************************
 * Copyright (c) 2024 BlackBerry Limited and contributors.
 *
 * Licensed under the MIT license. See LICENSE file in the project root for details.
 ***************************************************************************************/

export class ItemPropertiesSignalPayload {
    private outputDescriptorId: string | undefined;
    private experimentUUID: string | undefined;
    private properties: { [key: string]: string };

    constructor(props: { [key: string]: string }, expUUID?: string, descriptorId?: string) {
        this.properties = props;
        this.experimentUUID = expUUID;
        this.outputDescriptorId = descriptorId;
    }

    public getOutputDescriptorId(): string | undefined {
        return this.outputDescriptorId;
    }

    public getExperimentUUID(): string | undefined {
        return this.experimentUUID;
    }

    public getProperties(): { [key: string]: string } {
        return this.properties;
    }
}
