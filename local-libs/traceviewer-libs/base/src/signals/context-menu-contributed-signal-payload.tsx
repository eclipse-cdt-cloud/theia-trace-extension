/***************************************************************************************
 * Copyright (c) 2024 BlackBerry Limited and contributors.
 *
 * Licensed under the MIT license. See LICENSE file in the project root for details.
 ***************************************************************************************/
export interface MenuItem {
    id: string;
    label: string;
    // Parent Menu that this item belongs to - undefined indicates root menu item
    parentMenuId?: string;
}

export interface SubMenu {
    id: string;
    label: string;
    items: MenuItem[];
    submenu: SubMenu | undefined;
}

export interface ContextMenuItems {
    submenus: SubMenu[];
    items: MenuItem[];
}

export class ContextMenuContributedSignalPayload {
    private outputDescriptorId: string;
    private menuItems: ContextMenuItems;

    constructor(descriptorId: string, menuItems: ContextMenuItems) {
        this.outputDescriptorId = descriptorId;
        this.menuItems = menuItems;
    }

    public getOutputDescriptorId(): string {
        return this.outputDescriptorId;
    }

    public getMenuItems(): ContextMenuItems {
        return this.menuItems;
    }
}
