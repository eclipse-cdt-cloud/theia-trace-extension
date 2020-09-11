import { TspClient } from 'tsp-typescript-client/lib/protocol/tsp-client';
import * as vscode from 'vscode';

function createTspClient() {
    const tsConfig = vscode.workspace.getConfiguration('trace-compass.traceserver');
    const traceServerUrl = tsConfig.get<string>("url");
    const apiPath = tsConfig.get<string>("apiPath");
    return new TspClient((traceServerUrl ? traceServerUrl: 'http://localhost:8080') + '/' + (apiPath ? apiPath : 'tsp/api'));
}

export function updateTspClient() {
    tspClientInstance = createTspClient();
}

let tspClientInstance = createTspClient();

export const getTspClient = () => tspClientInstance;