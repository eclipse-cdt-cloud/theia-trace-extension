'use strict';
import * as vscode from 'vscode';
import { TracesProvider, traceHandler, fileHandler } from './trace-explorer/trace-tree';
import { AnalysisProvider, analysisHandler } from './trace-explorer/analysis-tree';
import { updateTspClient } from './utils/tspClient';

export function activate(context: vscode.ExtensionContext) {

  vscode.window.createTreeView('traces', {
    treeDataProvider: new TracesProvider(vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders[0].uri.fsPath : '')
  });
  const analysisProvider = new AnalysisProvider();
  vscode.window.createTreeView('analysis', {
    treeDataProvider: analysisProvider
  });
  const handler = traceHandler(analysisProvider);

  context.subscriptions.push(vscode.commands.registerCommand('traces.openTrace', trace => {
    handler(context, trace);
  }));

  context.subscriptions.push(vscode.commands.registerCommand('outputs.openOutput', output => {
    analysisHandler(context, output);
  }));

  // TODO: For now, a different command opens traces from file explorer. Remove when we have a proper trace finder
  const fileOpenHandler = fileHandler(analysisProvider);
  context.subscriptions.push(vscode.commands.registerCommand('traces.openTraceFile', file => {
    fileOpenHandler(context, file);
  }));

  // Listening to configuration change for the trace server URL
	context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(e => {

		if (e.affectsConfiguration('trace-compass.traceserver.url') || e.affectsConfiguration('trace-compass.traceserver.apiPath')) {
      updateTspClient();
		}

	}));

}
