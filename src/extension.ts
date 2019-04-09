import * as vscode from 'vscode';
import {createPipelineExplorer} from './explorer';

export function activate(context: vscode.ExtensionContext) {


  const disposables = [
    ...createPipelineExplorer()
  ];

  disposables.forEach((e) => {
    context.subscriptions.push(e);
  });
}

// this method is called when your extension is deactivated
export function deactivate() {}
