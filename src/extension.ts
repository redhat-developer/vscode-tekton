import * as vscode from 'vscode';
import {PipelineExplorer} from './pipeline/pipelineExplorer';
import {Pipeline} from './tekton/pipeline';
import {PipelineRun} from './tekton/pipelinerun';
import {Task} from './tekton/task';
import {TaskRun} from './tekton/taskrun';
import path = require('path');
import * as k8s from 'vscode-kubernetes-tools-api';
import { ClusterExplorerV1 } from 'vscode-kubernetes-tools-api';
import { TektonItem } from './tekton/tektonitem';

export let contextGlobalState: vscode.ExtensionContext;

export async function activate(context: vscode.ExtensionContext) {

    contextGlobalState = context;
 // vscode.commands.executeCommand('extention.vsKubernetes)

  const disposables = [
    vscode.commands.registerCommand('tekton.explorer.refresh', (context) =>  execute(PipelineExplorer.getInstance().refresh, context)),
    vscode.commands.registerCommand('tekton.pipeline.start', (context) =>  execute(Pipeline.start, context)),
    vscode.commands.registerCommand('tekton.pipeline.create.local', (context) => execute(Pipeline.createFromFolder, context)),
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
  
  const tektonExplorer = await k8s.extension.clusterExplorer.v1;
  if (tektonExplorer.available) {
    const nodeContributors = [
        tektonExplorer.api.nodeSources.resourceFolder("Pipelines", "Pipelines", "Pipeline", "pipeline").if(isTekton).at(undefined),
        tektonExplorer.api.nodeSources.resourceFolder("Pipelineruns", "Pipelineruns", "Pipelinerun", "pipelinerun").if(isTekton).at(undefined),
        tektonExplorer.api.nodeSources.resourceFolder("Tasks", "Tasks", "Task", "task").if(isTekton).at(undefined),
        tektonExplorer.api.nodeSources.resourceFolder("Taskruns", "Taskruns", "Taskrun", "taskrun").if(isTekton).at(undefined),
        tektonExplorer.api.nodeSources.resourceFolder("Clustertasks", "Clustertasks", "Clustertask", "clustertask").if(isTekton).at(undefined)
    ];
    nodeContributors.forEach(element => {
        tektonExplorer.api.registerNodeContributor(element);
    });
    tektonExplorer.api.registerNodeUICustomizer({customize});
}

let lastNamespace = '';

function customize(node: ClusterExplorerV1.ClusterExplorerResourceNode, treeItem: vscode.TreeItem): void | Thenable<void> {
    return customizeAsync(node, treeItem);
}
async function initNamespaceName(node: ClusterExplorerV1.ClusterExplorerResourceNode) {
    const kubectl = await k8s.extension.kubectl.v1;
    if (kubectl.available) {
        const result = await kubectl.api.invokeCommand('config view -o json');
        const config = JSON.parse(result.stdout);
        const currentContext = (config.contexts || []).find((ctx) => ctx.name === node.name);
        if (!currentContext) {
            return "";
        }
        return currentContext.context.namespace || "default";
    }
}

async function customizeAsync(node: ClusterExplorerV1.ClusterExplorerResourceNode, treeItem: vscode.TreeItem): Promise<void> {
    if ((node as any).nodeType === 'context') {
        lastNamespace = await initNamespaceName(node);
        if (isTekton()) {
            treeItem.iconPath = vscode.Uri.file(path.join(__dirname, "../images/tekton.png"));
        }
    }
    if (node.nodeType === 'resource' && node.resourceKind.manifestKind === 'Pipeline') {
        // assuming now that it’s a project node
        const pipelineName = node.name;
        if (pipelineName === lastNamespace) {
            treeItem.label = `* ${treeItem.label}`;
        } else {
            treeItem.contextValue = `${treeItem.contextValue || ''}.tekton.inactiveProject`;
        }
    }
}

async function isTekton(): Promise<boolean> {
    const kubectl = await k8s.extension.kubectl.v1;
    if (kubectl.available) {
        const sr = await kubectl.api.invokeCommand('api-versions');
        if (!sr || sr.code !== 0) {
            return false;
        }
        return sr.stdout.includes("tekton.dev/v1alpha1");  // Naive check to keep example simple!
    }
}
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
