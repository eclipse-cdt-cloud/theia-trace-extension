import * as Messages from '@tracecompass/base/lib/message-manager';

// eslint-disable-next-line
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
        vscode.postMessage({command: "newStatus", data: {messageKey, text, category, severity }});
        console.log("New status message", messageKey, text, category, severity);
    }

    removeStatusMessage(messageKey: string): void {
        vscode.postMessage({command: "rmStatus", data: { messageKey }});
        console.log("Removing status message status message", messageKey);
    }

}