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
import { TektonNode, Command, getStderrString } from './tkn';
import { registerYamlSchemaSupport } from './yaml-support/tkn-yaml-schema';
import { setCommandContext, CommandContext, enterZenMode, exitZenMode, refreshCustomTree, removeItemFromCustomTree } from './commands';
import { customTektonExplorer } from './pipeline/customTektonExplorer';
import { TektonItem } from './tekton/tektonitem';
import { showPipelinePreview, registerPipelinePreviewContext } from './pipeline/pipeline-preview';
import { TriggerTemplate } from './tekton/triggertemplate';
import { TriggerBinding } from './tekton/triggerbinding';
import { EventListener } from './tekton/eventlistener';
import { k8sCommands } from './kubernetes';
import { initializeTknEditing } from './yaml-support/tkn-editing';
import { ToolsConfig } from './tools';
import { TKN_RESOURCE_SCHEME, TKN_RESOURCE_SCHEME_READONLY, tektonVfsProvider } from './util/tekton-vfs';

export let contextGlobalState: vscode.ExtensionContext;
let k8sExplorer: k8s.ClusterExplorerV1 | undefined = undefined;

export async function activate(context: vscode.ExtensionContext): Promise<void> {

  // start detecting 'tkn' on extension start
  await ToolsConfig.detectOrDownload();

  contextGlobalState = context;
  migrateFromTkn018();

  const disposables = [
    vscode.commands.registerCommand('tekton.about', (context) => execute(Pipeline.about, context)),
    vscode.commands.registerCommand('tekton.pipeline.preview', showPipelinePreview),
    vscode.commands.registerCommand('tekton.output', (context) => execute(Pipeline.showTektonOutput, context)),
    vscode.commands.registerCommand('tekton.explorer.refresh', (context) => execute(Pipeline.refresh, context)),
    vscode.commands.registerCommand('tekton.pipeline.start', (context) => execute(Pipeline.start, context)),
    vscode.commands.registerCommand('tekton.openInEditor', (context) => execute(TektonItem.openInEditor, context)),
    vscode.commands.registerCommand('tekton.edit', (context) => execute(TektonItem.openInEditor, context)),
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
    vscode.commands.registerCommand('tekton.clustertask.list', (context) => execute(ClusterTask.list, context)),
    vscode.commands.registerCommand('tekton.clustertask.delete', (context) => execute(ClusterTask.delete, context)),
    vscode.commands.registerCommand('tekton.taskrun.list', (context) => execute(TaskRun.listFromPipelineRun, context)),
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
    vscode.commands.registerCommand('tekton.custom.explorer.removeItem', removeItemFromCustomTree),
    vscode.commands.registerCommand('k8s.tekton.run.logs', k8sCommands.showLogs),
    vscode.commands.registerCommand('k8s.tekton.run.followLogs', k8sCommands.followLogs),
    pipelineExplorer,
    // Temporarily loaded resource providers
    vscode.workspace.registerFileSystemProvider(TKN_RESOURCE_SCHEME, tektonVfsProvider, { isCaseSensitive: true, }),
    vscode.workspace.registerFileSystemProvider(TKN_RESOURCE_SCHEME_READONLY, tektonVfsProvider, { isCaseSensitive: true, isReadonly: true }),
  ];
  disposables.forEach((e) => context.subscriptions.push(e));

  setCommandContext(CommandContext.TreeZenMode, false);
  setCommandContext(CommandContext.PipelinePreview, false);

  const k8sExplorerApi = await k8s.extension.clusterExplorer.v1;
  if (k8sExplorerApi.available) {
    k8sExplorer = k8sExplorerApi.api;
    const nodeContributor = k8sExplorer.nodeSources.groupingFolder(
      'Tekton Pipelines',
      'context',
      k8sExplorer.nodeSources.resourceFolder('ClusterTasks', 'ClusterTasks', 'ClusterTask', 'clustertask').if(isTekton),
      k8sExplorer.nodeSources.resourceFolder('Tasks', 'Tasks', 'Task', 'task').if(isTekton),
      k8sExplorer.nodeSources.resourceFolder('TaskRuns', 'TaskRuns', 'TaskRun', 'taskruns').if(isTekton),
      k8sExplorer.nodeSources.resourceFolder('Pipelines', 'Pipelines', 'Pipeline', 'pipelines').if(isTekton),
      k8sExplorer.nodeSources.resourceFolder('PipelineRuns', 'PipelineRuns', 'PipelineRun', 'pipelineruns').if(isTekton),
      k8sExplorer.nodeSources.resourceFolder('Pipeline Resources', 'PipelineResources', 'PipelineResources', 'pipelineresources').if(isTekton),
      k8sExplorer.nodeSources.resourceFolder('TriggerTemplates', 'TriggerTemplates', 'TriggerTemplates', 'triggerTemplates').if(isTekton),
      k8sExplorer.nodeSources.resourceFolder('TriggerBinding', 'TriggerBinding', 'TriggerBinding', 'triggerBinding').if(isTekton),
      k8sExplorer.nodeSources.resourceFolder('EventListener', 'EventListener', 'EventListener', 'eventListener').if(isTekton),
      k8sExplorer.nodeSources.resourceFolder('Conditions', 'Conditions', 'Conditions', 'conditions').if(isTekton),
    ).at(undefined);
    k8sExplorer.registerNodeContributor(nodeContributor);
  }

  vscode.workspace.onDidSaveTextDocument(async (document: vscode.TextDocument) => {
    let value: string;
    if (document.uri.authority !== 'loadtektonresource') {
      const verifyTknYaml = tektonYaml.isTektonYaml(document);
      if (!context.globalState.get(document.uri.fsPath)) {
        value = await vscode.window.showWarningMessage('Detected Tekton yaml resource file. Do you want to deploy to cluster?', 'Save', 'Save Once', 'Cancel');
      }
      if (value === 'Save') {
        context.globalState.update(document.uri.fsPath, true);
      }
      if (verifyTknYaml && (/Save/.test(value) || context.globalState.get(document.uri.fsPath))) {
        const result = await cli.execute(Command.create(document.uri.fsPath))
        if (result.error) {
          vscode.window.showErrorMessage(getStderrString(result.error));
        } else {
          pipelineExplorer.refresh();
          vscode.window.showInformationMessage('Resources were successfully created.');
        }
      }
    }
  })

  registerYamlSchemaSupport(context);
  registerPipelinePreviewContext();
  initializeTknEditing(context);
}

async function isTekton(): Promise<boolean> {
  const kubectl = await k8s.extension.kubectl.v1;
  if (kubectl.available) {
    const sr = await kubectl.api.invokeCommand('api-versions');
    if (!sr || sr.code !== 0) {
      return false;
    }
    return sr.stdout.includes('tekton.dev/');  // Naive check to keep example simple!
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
