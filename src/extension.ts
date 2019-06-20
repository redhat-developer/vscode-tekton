import * as vscode from 'vscode';
import {PipelineExplorer} from './pipeline/pipelineExplorer';
import {createPipelineExplorer} from './explorer';

export function activate(context: vscode.ExtensionContext) {

 // vscode.commands.executeCommand('extention.vsKubernetes)

  const disposables = [
    ...createPipelineExplorer(),
    vscode.commands.registerCommand('pipeline.provider.refresh', (context) =>  execute(createPipelineExplorer.refresh(), context)),
    vscode.window.registerTreeDataProvider('tekton.pipelineExplorer',PipelineExplorer.getInstance()),
  ];
  disposables.forEach((e) => context.subscriptions.push(e));
}

function execute<T>(command: (...args: T[]) => Promise<any> | void, ...params: T[]) {
  try {
      const res = command.call(null, ...params);
      return res && res.then
          ? res.then((result: any) => {
              displayResult(result);

          }).catch((err: any) => {
              vscode.window.showErrorMessage(err.message ? err.message : err);
          })
          : undefined;
  } catch (err) {
      vscode.window.showErrorMessage(err);
  }
}


function displayResult(result?: any) {
    if (result && typeof result === 'string') {
        vscode.window.showInformationMessage(result);
    }
}


// this method is called when your extension is deactivated
export function deactivate() {}
