import * as vscode from 'vscode';
import {PipelineExplorer} from './pipeline/pipelineExplorer';
import {Pipeline} from './tekton/pipeline';
import {PipelineRun} from './tekton/pipelinerun';
import {Task} from './tekton/task';
import {TaskRun} from './tekton/taskrun';

export let contextGlobalState: vscode.ExtensionContext;

export function activate(context: vscode.ExtensionContext) {

    contextGlobalState = context;
 // vscode.commands.executeCommand('extention.vsKubernetes)

  const disposables = [
    vscode.commands.registerCommand('tekton.pipeline.create', (context) =>  execute(Pipeline.create, context)),
    vscode.commands.registerCommand('tekton.pipeline.list', (context) =>  execute(Pipeline.list, context)),
    vscode.commands.registerCommand('tekton.pipeline.describe', (context) =>  execute(Pipeline.describe, context)),
    vscode.commands.registerCommand('tekton.pipelinerun.list', (context) =>  execute(PipelineRun.list, context)),
    vscode.commands.registerCommand('tekton.pipelinerun.describe', (context) =>  execute(PipelineRun.describe, context)),
    vscode.commands.registerCommand('tekton.pipelinerun.logs', (context) =>  execute(PipelineRun.logs, context)),
    vscode.commands.registerCommand('tekton.task.list', (context) =>  execute(Task.list, context)),
    vscode.commands.registerCommand('tekton.taskrun.list', (context) =>  execute(TaskRun.list, context)),
    vscode.commands.registerCommand('tekton.taskrun.logs', (context) =>  execute(TaskRun.logs, context)),
    PipelineExplorer.getInstance()
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
