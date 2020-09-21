import * as vscode from 'vscode';
import * as Messages from '@trace-viewer/base/lib/message-manager';

const statusBarItem: { [ key: string ]: vscode.StatusBarItem} = {};

const statusPerExperiment: { [ key: string]: { [key: string]: string}} = {};

function getOrCreateBarItem(key: string, category: Messages.MessageCategory) {
    const statusBar = getBarItem(key);
    if (statusBar) {
        return statusBar;
    }
    const newBarItem = vscode.window.createStatusBarItem(category === Messages.MessageCategory.TRACE_CONTEXT ? vscode.StatusBarAlignment.Left : vscode.StatusBarAlignment.Right);
    statusBarItem[key] = newBarItem;
    return newBarItem;
}

function getBarItem(key: string) {
    return statusBarItem[key];
}

function setStatusForPanel(panelName: string, messageKey: string, message: string) {
    const expStatus = statusPerExperiment[panelName] || {};
    expStatus[messageKey] = message;
    statusPerExperiment[panelName] = expStatus;
}

function removeStatusForPanel(panelName: string, messageKey: string) {
    const expStatus = statusPerExperiment[panelName] || {};
    delete expStatus[messageKey];
}

export function handleStatusMessage(panelName: string, {
    text = '',
    category = Messages.MessageCategory.SERVER_MESSAGE,
    severity = Messages.MessageSeverity.INFO,
    messageKey = ''
}) {
    switch (severity) {
        case Messages.MessageSeverity.ERROR:
            vscode.window.showErrorMessage(text);
            return;
        case Messages.MessageSeverity.WARNING:
        case Messages.MessageSeverity.INFO:
            const barItem = getOrCreateBarItem(messageKey, category);
            barItem.text = text;
            barItem.show();
            if (messageKey) {
                setStatusForPanel(panelName, messageKey, text);
            }
            return;
        case Messages.MessageSeverity.DEBUG:
            console.log('Status message ' + messageKey + '(' + category + '): ' + text);
            return;
    }
}

export function handleRemoveMessage(panelName: string, {messageKey = ''}) {
    const barItem = getBarItem(messageKey);
    if (barItem) {
        barItem.text = '';
        barItem.hide();
    }
    removeStatusForPanel(panelName, messageKey);
}

export function setStatusFromPanel(panelName: string) {
    const expStatus = statusPerExperiment[panelName] || {};
    Object.keys(statusBarItem).forEach(barKey => {
        const message = expStatus[barKey] || '';
        statusBarItem[barKey].text = message;
        if (message) {
            statusBarItem[barKey].show();
        } else {
            statusBarItem[barKey].hide();
        }
    });
}
