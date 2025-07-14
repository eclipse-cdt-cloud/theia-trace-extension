export enum MessageCategory {
    TRACE_CONTEXT,
    SERVER_MESSAGE,
    SERVER_STATUS
}

export enum MessageSeverity {
    ERROR,
    WARNING,
    INFO,
    DEBUG
}

export interface StatusMessage {
    text: string;
    category?: MessageCategory;
    severity?: MessageSeverity;
}

export declare interface MessageManager {
    addStatusMessage(messageKey: string, message: StatusMessage): void;
    removeStatusMessage(messageKey: string): void;
}

export class MessageManager implements MessageManager {
    addStatusMessage(
        messageKey: string,
        { text, category = MessageCategory.SERVER_MESSAGE, severity = MessageSeverity.INFO }: StatusMessage
    ): void {
        console.log('New status message', messageKey, text, category, severity);
    }

    removeStatusMessage(messageKey: string): void {
        console.log('Removing status message status message', messageKey);
    }
}
