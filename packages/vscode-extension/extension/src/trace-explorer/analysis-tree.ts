import * as vscode from 'vscode';
import * as path from 'path';
import { OutputDescriptor } from 'tsp-typescript-client/lib/models/output-descriptor';
import { TraceViewerPanel } from '../trace-viewer-panel/trace-viewer-panel';

export class AnalysisProvider implements vscode.TreeDataProvider<Analysis> {

  private descriptors: OutputDescriptor[] = [];
  private _onDidChangeTreeData: vscode.EventEmitter<Analysis | undefined> = new vscode.EventEmitter<Analysis | undefined>();
  readonly onDidChangeTreeData: vscode.Event<Analysis | undefined> = this._onDidChangeTreeData.event;

  getTreeItem(element: Analysis): vscode.TreeItem {
    return element;
  }

  getChildren(element?: Analysis): Thenable<Analysis[]> {
    if (element) {
      return Promise.resolve([]);
    } else {
      if (this.descriptors.length === 0) {
        return Promise.resolve([]);
      } else {
        return Promise.resolve(this.descriptors.map(d => new Analysis(d)));
      }
    }
  }

  refresh(descriptors: OutputDescriptor[]): void {
    this.descriptors = descriptors;
    this._onDidChangeTreeData.fire(undefined);
  }
}

class Analysis extends vscode.TreeItem {
  _descriptor: OutputDescriptor;
  constructor(
    public readonly descriptor: OutputDescriptor,
  ) {
    super(descriptor.name);
    this._descriptor = descriptor;
  }

  get tooltip(): string {
    return `${this._descriptor.description}`;
  }

  get description(): string {
    return '';
  }

  iconPath = {
    light: path.join(__dirname, '..', '..', '..', 'resources', 'light', 'refresh.svg'),
    dark: path.join(__dirname, '..', '..', '..', 'resources', 'dark', 'refresh.svg')
  };
}

export const analysisHandler = (context: vscode.ExtensionContext, analysis: Analysis) => {
  const panel = TraceViewerPanel.addOutputToCurrent(analysis._descriptor);
};
