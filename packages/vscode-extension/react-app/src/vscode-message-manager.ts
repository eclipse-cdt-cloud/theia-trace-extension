import * as Messages from '@trace-viewer/base/lib/message-manager';

/* eslint-disable  @typescript-eslint/no-explicit-any, @typescript-eslint/class-name-casing */
interface vscode {
    postMessage(message: any): void;
}

// declare function acquireVsCodeApi(): vscode;
declare const vscode: vscode;

export class VsCodeMessageManager extends Messages.MessageManager {

    constructor() {
        super();
    }

    addStatusMessage(messageKey: string, {text,
        category = Messages.MessageCategory.SERVER_MESSAGE,
        severity = Messages.MessageSeverity.INFO }: Messages.StatusMessage): void {
        vscode.postMessage({command: 'newStatus', data: {messageKey, text, category, severity }});
    }

    removeStatusMessage(messageKey: string): void {
        vscode.postMessage({command: 'rmStatus', data: { messageKey }});
    }

}
