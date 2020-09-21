import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { Trace as TspTrace } from 'tsp-typescript-client/lib/models/trace';
import { TraceManager } from "@trace-viewer/base/lib/trace-manager";
import { ExperimentManager } from "@trace-viewer/base/lib/experiment-manager";
import { AnalysisProvider } from "./analysis-tree";
import { TraceViewerPanel } from "../trace-viewer-panel/trace-viewer-panel";
import { getTspClient } from "../utils/tspClient";

const rootPath = path.resolve(__dirname, '../../..');

const traceManager = new TraceManager(getTspClient());
const experimentManager = new ExperimentManager(getTspClient());

export class TracesProvider implements vscode.TreeDataProvider<Trace> {
  constructor(private workspaceRoot: string) { }

  getTreeItem(element: Trace): vscode.TreeItem {
    return element;
  }

  getChildren(element?: Trace): Thenable<Trace[]> {
    if (!this.workspaceRoot) {
      vscode.window.showInformationMessage('No traces. Empty workspace');
      return Promise.resolve([]);
    }

    if (element) {
      // if (element.children.length > 0) {
      //   return Promise.resolve(element.children.map(child => this.getTrace(element.uri, child)));
      // } else {
      //   return Promise.resolve([]);
      // }
      return Promise.resolve([]);
    } else {
      return Promise.resolve(
        fs.readdirSync(this.workspaceRoot, { withFileTypes: true })
          .filter(dirent => dirent.isDirectory())
          .map(dirent => dirent.name).map(dir => this.getTrace(this.workspaceRoot, dir))
      );
    }
  }

  private getTrace(source: string, trace: string) {
    const uri = path.resolve(source, trace);
    const children = fs.readdirSync(uri, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory()).map(dirent => dirent.name);
    if (children.length > 0) {
      // return new Experiment(trace, vscode.TreeItemCollapsibleState.Collapsed, uri, children);
      return new Trace(trace, vscode.TreeItemCollapsibleState.None, uri, children);
    } else {
      return new Trace(trace, vscode.TreeItemCollapsibleState.None, uri, []);
    }
  }
}

export class Trace extends vscode.TreeItem {
  constructor(
    public readonly name: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly uri: string,
    public readonly children: string[]
  ) {
    super(name, collapsibleState);
  }

  get tooltip(): string {
    return `${this.name} ${this.uri}`;
  }

  get description(): string {
    return "";
  }

  iconPath = {
    light: path.resolve(rootPath, 'assets', 'resources', 'light', 'dependency.svg'),
    dark: path.resolve(rootPath, 'assets', 'resources', 'dark', 'dependency.svg')
  };
}

export const traceHandler = (analysisTree: AnalysisProvider) => (context: vscode.ExtensionContext, trace: Trace) => {
  const panel = TraceViewerPanel.createOrShow(context.extensionPath, trace.name);
  (async () => {
    const traces = new Array<TspTrace>();
    const t = await traceManager.openTrace(trace.uri, trace.name);
    if (t) { traces.push(t); };
    const experiment = await experimentManager.openExperiment(trace.name, traces);
    if (experiment) {
      panel.setExperiment(experiment);
      const descriptors = await experimentManager.getAvailableOutputs(experiment.UUID);
      if (descriptors && descriptors.length) {
        analysisTree.refresh(descriptors);
      }
    }
  })();
};