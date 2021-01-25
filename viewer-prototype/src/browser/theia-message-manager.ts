import * as Messages from '@trace-viewer/base/lib/message-manager';
import { inject, injectable } from 'inversify';
import { StatusBar, StatusBarAlignment } from '@theia/core/lib/browser';

/* eslint-disable @typescript-eslint/no-unused-vars */

@injectable()
export class TheiaMessageManager implements Messages.MessageManager {

    constructor(
        @inject(StatusBar) protected readonly statusBar: StatusBar,
    ) {

    }

    addStatusMessage(messageKey: string, {text,
        category = Messages.MessageCategory.SERVER_MESSAGE,
        severity = Messages.MessageSeverity.INFO }: Messages.StatusMessage): void {
        this.statusBar.setElement(messageKey, {text: text, alignment: StatusBarAlignment.RIGHT});
    }

    removeStatusMessage(messageKey: string): void {
        this.statusBar.removeElement(messageKey);
    }

}
