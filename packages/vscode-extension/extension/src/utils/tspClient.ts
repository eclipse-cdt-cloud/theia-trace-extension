import { TspClient } from 'tsp-typescript-client/lib/protocol/tsp-client';
import * as vscode from 'vscode';

/**
 * Get the trace server URL as configured in the configuration options.
 * The URL will always terminate with the '/' character.
 *
 * @return The server name part of the trace server URL, including the
 * protocol http or https, the port and the trailing '/'.
 */
export function getTraceServerUrl(): string {
    const tsConfig = vscode.workspace.getConfiguration('trace-compass.traceserver');
    const traceServerUrl = tsConfig.get<string>('url');
    if (!traceServerUrl) {
        return 'http://localhost:8080/';
    }
    return traceServerUrl.endsWith('/') ? traceServerUrl : traceServerUrl + '/' ;
}

export function getTspClientUrl(): string {
    const tsConfig = vscode.workspace.getConfiguration('trace-compass.traceserver');
    const traceServerUrl = getTraceServerUrl();
    const apiPath = tsConfig.get<string>('apiPath');
    return traceServerUrl + (apiPath ? apiPath : 'tsp/api');
}

function createTspClient(): TspClient {
    return new TspClient(getTspClientUrl());
}

export function updateTspClient(): void {
    tspClientInstance = createTspClient();
}

let tspClientInstance = createTspClient();

export const getTspClient = (): TspClient => tspClientInstance;
