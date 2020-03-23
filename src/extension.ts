/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { PipelineExplorer, pipelineExplorer } from './pipeline/pipelineExplorer';
import { Pipeline } from './tekton/pipeline';
import { PipelineRun } from './tekton/pipelinerun';
import { Task } from './tekton/task';
import { TaskRun } from './tekton/taskrun';
import { Platform } from './util/platform';
import path = require('path');
import fsx = require('fs-extra');
import * as k8s from 'vscode-kubernetes-tools-api';
import { ClusterTask } from './tekton/clustertask';
import { PipelineResource } from './tekton/pipelineresource';
import { TektonNode } from './tkn';
import { registerYamlSchemaSupport } from './yaml-support/tkn-yaml-schema';
import { setCommandContext, CommandContext, enterZenMode, exitZenMode, refreshCustomTree } from './commands';
import { customTektonExplorer } from './pipeline/customTektonExplorer';
import { TektonResourceVirtualFileSystemProvider, TKN_RESOURCE_SCHEME } from './util/tektonresources.virtualfs';
import { TektonItem } from './tekton/tektonitem';
import { showPipelinePreview, registerPipelinePreviewContext } from './pipeline/pipeline-preview';
import { TriggerTemplate } from './tekton/triggertemplate';
import { TriggerBinding } from './tekton/triggerbinding';
import { EventListener } from './tekton/eventlistener';

export let contextGlobalState: vscode.ExtensionContext;
let tektonExplorer: k8s.ClusterExplorerV1 | undefined = undefined;

export async function activate(context: vscode.ExtensionContext): Promise<void> {

  const resourceDocProvider = new TektonResourceVirtualFileSystemProvider();

  contextGlobalState = context;
  migrateFromTkn018();

  const disposables = [
    vscode.commands.registerCommand('tekton.about', (context) => execute(Pipeline.about, context)),
    vscode.commands.registerCommand('tekton.pipeline.preview', showPipelinePreview),
    vscode.commands.registerCommand('tekton.output', (context) => execute(Pipeline.showTektonOutput, context)),
    vscode.commands.registerCommand('tekton.explorer.refresh', (context) => execute(Pipeline.refresh, context)),
    vscode.commands.registerCommand('tekton.pipeline.start', (context) => execute(Pipeline.start, context)),
    vscode.commands.registerCommand('tekton.openInEditor', (context) => execute(TektonItem.openInEditor, context)),
    vscode.commands.registerCommand('tekton.pipeline.restart', (context) => execute(Pipeline.restart, context)),
    //vscode.commands.registerCommand('tekton.pipeline.createFromLocal', (context) => execute(Pipeline.createFromLocal, context)),
    vscode.commands.registerCommand('tekton.pipeline.list', (context) => execute(Pipeline.list, context)),
    vscode.commands.registerCommand('tekton.pipeline.describe', (context) => execute(Pipeline.describe, context)),
    vscode.commands.registerCommand('tekton.pipeline.delete', (context) => execute(Pipeline.delete, context)),
    vscode.commands.registerCommand('tekton.pipelineresource.list', (context) => execute(PipelineResource.list, context)),
    vscode.commands.registerCommand('tekton.pipelineresource.create', (context) => execute(PipelineResource.create, context)),
    vscode.commands.registerCommand('tekton.pipelineresource.create.palette', (context) => execute(PipelineResource.create, context)),
    vscode.commands.registerCommand('tekton.pipelineresource.describe', (context) => execute(PipelineResource.describe, context)),
    vscode.commands.registerCommand('tekton.pipelineresource.delete', (context) => execute(PipelineResource.delete, context)),
    //vscode.commands.registerCommand('tekton.pipelinerun.restart', (context) => execute(PipelineRun.restart, context)),
    vscode.commands.registerCommand('tekton.pipelinerun.list', (context) => execute(PipelineRun.list, context)),
    vscode.commands.registerCommand('tekton.pipelinerun.describe', (context) => execute(PipelineRun.describe, context)),
    vscode.commands.registerCommand('tekton.pipelinerun.logs', (context) => execute(PipelineRun.logs, context)),
    vscode.commands.registerCommand('tekton.pipelinerun.followLogs', (context) => execute(PipelineRun.followLogs, context)),
    vscode.commands.registerCommand('tekton.pipelinerun.cancel', (context) => execute(PipelineRun.cancel, context)),
    vscode.commands.registerCommand('tekton.pipelinerun.delete', (context) => execute(PipelineRun.delete, context)),
    vscode.commands.registerCommand('tekton.task.start', (context) => execute(Task.start, context)),
    vscode.commands.registerCommand('tekton.task.list', (context) => execute(Task.list, context)),
    vscode.commands.registerCommand('tekton.task.delete', (context) => execute(Task.delete, context)),
    vscode.commands.registerCommand('tekton.triggertemplate.delete', (context) => execute(TriggerTemplate.delete, context)),
    vscode.commands.registerCommand('tekton.triggerbinding.delete', (context) => execute(TriggerBinding.delete, context)),
    vscode.commands.registerCommand('tekton.eventlistener.delete', (context) => execute(EventListener.delete, context)),
    vscode.commands.registerCommand('tekton.clustertask.start', (context) => execute(ClusterTask.start, context)),
    vscode.commands.registerCommand('tekton.clustertask.list', (context) => execute(ClusterTask.list, context)),
    vscode.commands.registerCommand('tekton.clustertask.delete', (context) => execute(ClusterTask.delete, context)),
    vscode.commands.registerCommand('tekton.taskrun.list', (context) => execute(TaskRun.list, context)),
    vscode.commands.registerCommand('tekton.taskrun.listFromTask', (context) => execute(TaskRun.listFromTask, context)),
    vscode.commands.registerCommand('tekton.taskrun.logs', (context) => execute(TaskRun.logs, context)),
    vscode.commands.registerCommand('tekton.taskrun.followLogs', (context) => execute(TaskRun.followLogs, context)),
    // vscode.commands.registerCommand('tekton.taskrun.cancel', (context) => execute(TaskRun.cancel, context)),
    vscode.commands.registerCommand('tekton.taskrun.delete', (context) => execute(TaskRun.delete, context)),
    vscode.commands.registerCommand('tekton.explorer.reportIssue', () => PipelineExplorer.reportIssue()),
    vscode.commands.registerCommand('_tekton.explorer.more', expandMoreItem),
    vscode.commands.registerCommand('tekton.explorer.enterZenMode', enterZenMode),
    vscode.commands.registerCommand('tekton.custom.explorer.exitZenMode', exitZenMode),
    vscode.commands.registerCommand('tekton.custom.explorer.refresh', refreshCustomTree),
    pipelineExplorer,
    // Temporarily loaded resource providers
    vscode.workspace.registerFileSystemProvider(TKN_RESOURCE_SCHEME, resourceDocProvider, { /* TODO: case sensitive? */ }),

  ];
  disposables.forEach((e) => context.subscriptions.push(e));

  setCommandContext(CommandContext.TreeZenMode, false);
  setCommandContext(CommandContext.PipelinePreview, false);

  const tektonExplorerAPI = await k8s.extension.clusterExplorer.v1;
  if (tektonExplorerAPI.available) {
    tektonExplorer = tektonExplorerAPI.api;
    const nodeContributor = tektonExplorer.nodeSources.groupingFolder(
      'Tekton Pipelines',
      'context',
      tektonExplorer.nodeSources.resourceFolder('ClusterTasks', 'ClusterTasks', 'ClusterTask', 'clustertask').if(isTekton),
      tektonExplorer.nodeSources.resourceFolder('Tasks', 'Tasks', 'Task', 'task').if(isTekton),
      tektonExplorer.nodeSources.resourceFolder('TaskRuns', 'TaskRuns', 'TaskRun', 'taskruns').if(isTekton),
      tektonExplorer.nodeSources.resourceFolder('Pipelines', 'Pipelines', 'Pipeline', 'pipelines').if(isTekton),
      tektonExplorer.nodeSources.resourceFolder('PipelineRuns', 'PipelineRuns', 'PipelineRun', 'pipelineruns').if(isTekton),
      tektonExplorer.nodeSources.resourceFolder('Pipeline Resources', 'PipelineResources', 'PipelineResources', 'pipelineresources').if(isTekton),
    ).at(undefined);
    tektonExplorer.registerNodeContributor(nodeContributor);
  } else {
    vscode.window.showErrorMessage('Command not available: ${tektonExplorer.reason}');
  }

  registerYamlSchemaSupport(context);
  registerPipelinePreviewContext();
}

async function isTekton(): Promise<boolean> {
  const kubectl = await k8s.extension.kubectl.v1;
  if (kubectl.available) {
    const sr = await kubectl.api.invokeCommand('api-versions');
    if (!sr || sr.code !== 0) {
      return false;
    }
    return sr.stdout.includes('tekton.dev/v1alpha1');  // Naive check to keep example simple!
  }
}

// this method is called when your extension is deactivated
// eslint-disable-next-line @typescript-eslint/no-empty-function
export function deactivate(): void {
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function execute<T>(command: (...args: T[]) => Promise<any> | void, ...params: T[]): any | undefined {
  try {
    const res = command.call(null, ...params);
    return res && res.then
      ? res.then((result: string) => {
        displayResult(result);
      }).catch((err: Error) => {
        vscode.window.showErrorMessage(err.message ? err.message : err.toString());
      })
      : undefined;
  } catch (err) {
    vscode.window.showErrorMessage(err);
  }
}


function displayResult(result?: string): void {
  if (result && typeof result === 'string') {
    vscode.window.showInformationMessage(result);
  }
}

function migrateFromTkn018(): void {
  const newCfgDir = path.join(Platform.getUserHomePath(), '.tkn');
  const newCfg = path.join(newCfgDir, 'tkn-config.yaml');
  const oldCfg = path.join(Platform.getUserHomePath(), '.kube', 'tkn');
  if (!fsx.existsSync(newCfg) && fsx.existsSync(oldCfg)) {
    fsx.ensureDirSync(newCfgDir);
    fsx.copyFileSync(oldCfg, newCfg);
  }
}

function expandMoreItem(context: number, parent: TektonNode, treeViewId: string): void {
  parent.visibleChildren += context;
  if (treeViewId === 'tektonPipelineExplorerView') {
    pipelineExplorer.refresh(parent);
  }

  if (treeViewId === 'tektonCustomTreeView') {
    customTektonExplorer.refresh(parent);
  }

}
