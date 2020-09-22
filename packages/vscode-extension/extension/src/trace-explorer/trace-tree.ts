import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { Trace as TspTrace } from 'tsp-typescript-client/lib/models/trace';
import { TraceManager } from '@trace-viewer/base/lib/trace-manager';
import { ExperimentManager } from '@trace-viewer/base/lib/experiment-manager';
import { AnalysisProvider } from './analysis-tree';
import { TraceViewerPanel } from '../trace-viewer-panel/trace-viewer-panel';
import { getTspClient } from '../utils/tspClient';

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
    return '';
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
    if (t) { traces.push(t); }
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

export const fileHandler = (analysisTree: AnalysisProvider) => (context: vscode.ExtensionContext, file: any) => {
  const uri: string = file.path;
  if (!uri) {
    console.log("Cannot open trace: invalid uri for file", file);
    return;
  }
  const name = uri.substring(uri.lastIndexOf('/') + 1);
  const panel = TraceViewerPanel.createOrShow(context.extensionPath, name);
  (async () => {

    /*
     * TODO: use backend service to find traces
     */
    const tracesArray: string[] = [];
    const fileStat = await vscode.workspace.fs.stat(file);
    if (fileStat) {
      if (fileStat.type === vscode.FileType.Directory) {
          // Find recursivly CTF traces
          const foundTraces = await findTraces(uri);
          foundTraces.forEach(trace => tracesArray.push(trace));
      } else {
          // Open single trace file
          tracesArray.push(uri);
      }
    }

    const traces = new Array<TspTrace>();
    for (let i = 0; i < tracesArray.length; i++) {
      const traceName = tracesArray[i].substring(tracesArray[i].lastIndexOf('/') + 1);
      const trace = await traceManager.openTrace(tracesArray[i], traceName);
      if (trace) {
          traces.push(trace);
      }
    }

    const experiment = await experimentManager.openExperiment(name, traces);
    if (experiment) {
      panel.setExperiment(experiment);
      const descriptors = await experimentManager.getAvailableOutputs(experiment.UUID);
      if (descriptors && descriptors.length) {
        analysisTree.refresh(descriptors);
      }
    }

  })();
};

/*
* TODO: Make a proper trace finder, not just CTF
*/
const findTraces = async (directory: string): Promise<string[]> => {
  const traces: string[] = [];
  const uri = vscode.Uri.file(directory);
  /**
    * If single file selection then return single trace in traces, if directory then find
    * recoursivly CTF traces in starting from root directory.
    */
  const ctf = await isCtf(directory);
  if (ctf) {
      traces.push(directory);
  } else {
    // Look at the sub-directories of this 
    const fileStat = await vscode.workspace.fs.stat(uri);
    const childrenArr = await vscode.workspace.fs.readDirectory(uri);
    for (const child of childrenArr) {
      if (child[1] === vscode.FileType.Directory) {
        const subTraces = await findTraces(directory + '/' + child[0]);
        subTraces.forEach(trace => traces.push(trace));
      }
    }
  }
  return traces;
};

const isCtf = async (directory: string): Promise<boolean> => {
  const uri = vscode.Uri.file(directory);
  const childrenArr = await vscode.workspace.fs.readDirectory(uri);
  for (const child of childrenArr) {
    if (child[0] === 'metadata') {
      return true;
    }
  }
  return false;
};
