import * as vscode from 'vscode';
import { PipelineExplorer } from './pipeline/pipelineExplorer';
import { Pipeline } from './tekton/pipeline';
import { PipelineRun } from './tekton/pipelinerun';
import { Task } from './tekton/task';
import { TaskRun } from './tekton/taskrun';
import { Platform } from './util/platform';
import path = require('path');
import fsx = require('fs-extra');
import * as k8s from 'vscode-kubernetes-tools-api';
import { ClusterTask } from './tekton/clustertask';

export let contextGlobalState: vscode.ExtensionContext;
let tektonExplorer: k8s.ClusterExplorerV1 | undefined = undefined;

export async function activate(context: vscode.ExtensionContext) {

    contextGlobalState = context;
    migrateFromTkn018();

    const disposables = [
        vscode.commands.registerCommand('tekton.about', (context) => execute(Pipeline.about, context)),
        vscode.commands.registerCommand('tekton.explorer.refresh', (context) => execute(Pipeline.refresh , context)),
        vscode.commands.registerCommand('tekton.pipeline.start', (context) => execute(Pipeline.start, context)),
        vscode.commands.registerCommand('tekton.pipeline.restart', (context) => execute(Pipeline.restart, context)),
        vscode.commands.registerCommand('tekton.pipeline.create.local', (context) => execute(Pipeline.createFromFolder, context)),
        vscode.commands.registerCommand('tekton.pipeline.list', (context) => execute(Pipeline.list, context)),
        vscode.commands.registerCommand('tekton.pipeline.describe', (context) => execute(Pipeline.describe, context)),
        vscode.commands.registerCommand('tekton.pipeline.delete', (context) => execute(Pipeline.delete, context)),
        vscode.commands.registerCommand('tekton.pipelinerun.list', (context) => execute(PipelineRun.list, context)),
        vscode.commands.registerCommand('tekton.pipelinerun.describe', (context) => execute(PipelineRun.describe, context)),
        vscode.commands.registerCommand('tekton.pipelinerun.logs', (context) => execute(PipelineRun.logs, context)),
        vscode.commands.registerCommand('tekton.pipelinerun.cancel', (context) => execute(PipelineRun.cancel, context)),
        vscode.commands.registerCommand('tekton.pipelinerun.delete', (context) => execute(PipelineRun.delete, context)),
        vscode.commands.registerCommand('tekton.task.start', (context) => execute(Task.start, context)),
        vscode.commands.registerCommand('tekton.task.list', (context) => execute(Task.list, context)),
        vscode.commands.registerCommand('tekton.task.delete', (context) => execute(Task.delete, context)),
        vscode.commands.registerCommand('tekton.clustertask.start', (context) => execute(ClusterTask.start, context)),
        vscode.commands.registerCommand('tekton.clustertask.list', (context) => execute(ClusterTask.list, context)),
        vscode.commands.registerCommand('tekton.clustertask.delete', (context) => execute(ClusterTask.delete, context)),
        vscode.commands.registerCommand('tekton.taskrun.list', (context) => execute(TaskRun.list, context)),
        vscode.commands.registerCommand('tekton.taskrun.logs', (context) => execute(TaskRun.logs, context)),
        vscode.commands.registerCommand('tekton.taskrun.cancel', (context) => execute(TaskRun.cancel, context)),
        vscode.commands.registerCommand('tekton.taskrun.delete', (context) => execute(TaskRun.delete, context)),
        vscode.commands.registerCommand('tekton.explorer.reportIssue', () => PipelineExplorer.reportIssue()),
        PipelineExplorer.getInstance()
    ];
    disposables.forEach((e) => context.subscriptions.push(e));


    const tektonExplorerAPI = await k8s.extension.clusterExplorer.v1;
    if (tektonExplorerAPI.available) {
        tektonExplorer = tektonExplorerAPI.api;
        const nodeContributor = tektonExplorer.nodeSources.groupingFolder(
                "Tekton Pipelines",
                "context",
                tektonExplorer.nodeSources.resourceFolder("ClusterTasks", "ClusterTasks", "ClusterTask", "clustertask").if(isTekton),
                tektonExplorer.nodeSources.resourceFolder("Tasks", "Tasks", "Task", "task").if(isTekton),
                tektonExplorer.nodeSources.resourceFolder("Taskruns", "Taskruns", "Taskrun", "taskruns").if(isTekton),
                tektonExplorer.nodeSources.resourceFolder("Pipelines", "Pipelines", "Pipeline", "pipelines").if(isTekton),
                tektonExplorer.nodeSources.resourceFolder("Pipelineruns", "Pipelineruns", "Pipelinerun", "pipelineruns").if(isTekton),
                tektonExplorer.nodeSources.resourceFolder("Pipeline Resources", "PipelineResources", "ClusterTask", "clustertask").if(isTekton),
            ).at(undefined);
        tektonExplorer.registerNodeContributor(nodeContributor);
    } else {
        vscode.window.showErrorMessage('Command not available: ${tektonExplorer.reason}');
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

// this method is called when your extension is deactivated
export function deactivate() {
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

function migrateFromTkn018() {
    const newCfgDir = path.join(Platform.getUserHomePath(), '.tkn');
    const newCfg = path.join(newCfgDir, 'tkn-config.yaml');
    const oldCfg = path.join(Platform.getUserHomePath(), '.kube', 'tkn');
    if (!fsx.existsSync(newCfg) && fsx.existsSync(oldCfg)) {
        fsx.ensureDirSync(newCfgDir);
        fsx.copyFileSync(oldCfg, newCfg);
    }
}
