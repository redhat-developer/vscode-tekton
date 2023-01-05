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
import { registerYamlSchemaSupport } from './yaml-support/tkn-yaml-schema';
import { setCommandContext, CommandContext, enterZenMode, exitZenMode, refreshCustomTree, removeItemFromCustomTree } from './commands';
import { customTektonExplorer } from './pipeline/customTektonExplorer';
import { TektonItem } from './tekton/tektonitem';
import { showPipelinePreview, registerPipelinePreviewContext } from './pipeline/pipeline-preview';
import { k8sCommands } from './kubernetes';
import { initializeTknEditing } from './yaml-support/tkn-editing';
import { ToolsConfig } from './tools';
import { TKN_RESOURCE_SCHEME, TKN_RESOURCE_SCHEME_READONLY, tektonVfsProvider } from './util/tekton-vfs';
import { updateTektonResource } from './tekton/deploy';
import { deleteFromExplorer, deleteFromCustom } from './commands/delete';
import { addTrigger } from './tekton/trigger';
import { triggerDetection } from './util/detection';
import { showDiagnosticData } from './tekton/diagnostic';
import { TriggerTemplate } from './tekton/triggertemplate';
import { TektonHubTasksViewProvider } from './hub/hub-view';
import { registerLogDocumentProvider } from './util/log-in-editor';
import { openPipelineRunTemplate, openTaskRunTemplate } from './tekton/generate-template';
import sendTelemetry, { startTelemetry, telemetryLogError, TelemetryProperties } from './telemetry';
import { cli, createCliCommand } from './cli';
import { getVersion, tektonVersionType } from './util/tknversion';
import { TektonNode } from './tree-view/tekton-node';
import { checkClusterStatus } from './util/check-cluster-status';
import { getClusterVersions } from './cluster-version';
import { debug } from './debugger/debug';
import { debugExplorer } from './debugger/debugExplorer';
import { showDebugContinue } from './debugger/debug-continue';
import { cancelTaskRun } from './debugger/cancel-taskrun';
import { showDebugFailContinue } from './debugger/debug-fail-continue';
import { openContainerInTerminal } from './debugger/show-in-terminal';
import { debugName, debugSessions, pipelineTriggerStatus } from './util/map-object';
import { deleteDebugger } from './debugger/delete-debugger';
import { bundleWizard } from './tekton/bundle-pipeline-task';
import { ERR_CLUSTER_TIMED_OUT } from './constants';

export let contextGlobalState: vscode.ExtensionContext;
let k8sExplorer: k8s.ClusterExplorerV1 | undefined = undefined;

export async function activate(context: vscode.ExtensionContext): Promise<void> {

  contextGlobalState = context;
  migrateFromTkn018();
  startTelemetry(context);

  const hubViewProvider = new TektonHubTasksViewProvider(context.extensionUri);

  const disposables = [
    vscode.commands.registerCommand('tekton.about', () => execute(Pipeline.about, 'tekton.about')),
    vscode.commands.registerCommand('tekton.bundle', () => bundleWizard(), 'tekton.bundle'),
    vscode.commands.registerCommand('tekton.pipeline.preview', () => execute(showPipelinePreview, 'tekton.pipeline.preview')),
    vscode.commands.registerCommand('tekton.output', () => execute(Pipeline.showTektonOutput, 'tekton.output')),
    vscode.commands.registerCommand('tekton.explorer.refresh', () => execute(Pipeline.refresh, 'tekton.explorer.refresh')),
    vscode.commands.registerCommand('k8s.tekton.pipeline.start', (context) => execute(k8sCommands.startPipeline, context, 'k8s.tekton.pipeline.start')),
    vscode.commands.registerCommand('k8s.tekton.task.start', (context) => execute(k8sCommands.startTask, context, 'k8s.tekton.task.start')),
    vscode.commands.registerCommand('tekton.pipeline.start', (context) => execute(Pipeline.start, context, 'tekton.pipeline.start')),
    vscode.commands.registerCommand('tekton.addTrigger', (context) => execute(addTrigger, context, 'tekton.addTrigger')),
    vscode.commands.registerCommand('tekton.pipeline.start.palette', (context) => execute(Pipeline.start, context, 'tekton.pipeline.start.palette')),
    vscode.commands.registerCommand('tekton.openInEditor', (context) => execute(TektonItem.openInEditor, context, 'tekton.openInEditor')),
    vscode.commands.registerCommand('tekton.edit', (context) => execute(TektonItem.openInEditor, context, 'tekton.edit')),
    vscode.commands.registerCommand('tekton.pipeline.restart', (context) => execute(Pipeline.restart, context, 'tekton.pipeline.restart')),
    vscode.commands.registerCommand('tekton.pipeline.describe', (context) => execute(Pipeline.describe, context)),
    vscode.commands.registerCommand('tekton.pipeline.describe.palette', (context) => execute(Pipeline.describe, context)),
    vscode.commands.registerCommand('tekton.explorerView.delete', (context) => deleteFromExplorer(context, 'tekton.explorerView.delete')),
    vscode.commands.registerCommand('tekton.customView.delete', (context) => deleteFromCustom(context), 'tekton.customView.delete'),
    vscode.commands.registerCommand('tekton.pipelineresource.describe', (context) => execute(PipelineResource.describe, context)),
    vscode.commands.registerCommand('tekton.pipelineresource.describe.palette', (context) => execute(PipelineResource.describe, context)),
    vscode.commands.registerCommand('tekton.pipelinerun.describe', (context) => execute(PipelineRun.describe, context)),
    vscode.commands.registerCommand('tekton.pipelinerun.describe.palette', (context) => execute(PipelineRun.describe, context)),
    vscode.commands.registerCommand('tekton.pipelinerun.restart', (context) => execute(PipelineRun.restart, context, 'tekton.pipelinerun.restart')),
    vscode.commands.registerCommand('tekton.showDiagnosticDataAction', (context) => execute(showDiagnosticData, context, 'tekton.showDiagnosticDataAction')),
    vscode.commands.registerCommand('tekton.taskrun.restart', (context) => execute(TaskRun.restartTaskRun, context, 'tekton.taskrun.restart')),
    vscode.commands.registerCommand('tekton.pipelinerun.logs', (context) => execute(PipelineRun.logs, context)),
    vscode.commands.registerCommand('tekton.pipelinerun.logs.palette', (context) => execute(PipelineRun.logs, context)),
    vscode.commands.registerCommand('tekton.pipelinerun.followLogs', (context) => execute(PipelineRun.followLogs, context)),
    vscode.commands.registerCommand('tekton.pipelinerun.followLogs.palette', (context) => execute(PipelineRun.followLogs, context)),
    vscode.commands.registerCommand('tekton.pipelinerun.cancel', (context) => execute(PipelineRun.cancel, context)),
    vscode.commands.registerCommand('tekton.pipelinerun.cancel.palette', (context) => execute(PipelineRun.cancel, context)),
    vscode.commands.registerCommand('tekton.triggerTemplate.url', (context) => execute(TriggerTemplate.copyExposeUrl, context, 'tekton.triggerTemplate.url')),
    vscode.commands.registerCommand('tekton.task.start', (context) => execute(Task.start, context, 'tekton.task.start')),
    vscode.commands.registerCommand('tekton.task.start.palette', (context) => execute(Task.start, context, 'tekton.task.start.palette')),
    vscode.commands.registerCommand('tekton.clusterTask.start', (context) => execute(ClusterTask.start, context, 'tekton.clusterTask.start')),
    vscode.commands.registerCommand('tekton.taskrun.list', (context) => execute(TaskRun.listFromPipelineRun, context)),
    vscode.commands.registerCommand('tekton.taskrun.list.palette', (context) => execute(TaskRun.listFromPipelineRun, context)),
    vscode.commands.registerCommand('tekton.taskrun.listFromTask.palette', (context) => execute(TaskRun.listFromTask, context)),
    vscode.commands.registerCommand('tekton.taskrun.logs', (context) => execute(TaskRun.logs, context)),
    vscode.commands.registerCommand('tekton.taskrun.logs.palette', (context) => execute(TaskRun.logs, context)),
    vscode.commands.registerCommand('tekton.taskrun.followLogs', (context) => execute(TaskRun.followLogs, context)),
    vscode.commands.registerCommand('tekton.taskrun.followLogs.palette', (context) => execute(TaskRun.followLogs, context)),
    vscode.commands.registerCommand('tekton.explorer.reportIssue', () => PipelineExplorer.reportIssue('tekton.explorer.reportIssue')),
    vscode.commands.registerCommand('_tekton.explorer.more', expandMoreItem),
    vscode.commands.registerCommand('tekton.explorer.enterZenMode', enterZenMode),
    vscode.commands.registerCommand('tekton.custom.explorer.exitZenMode', exitZenMode),
    vscode.commands.registerCommand('tekton.pipelineRun.template', (context) => execute(openPipelineRunTemplate, context)),
    vscode.commands.registerCommand('tekton.custom.explorer.refresh', () => refreshCustomTree('tekton.custom.explorer.refresh')),
    vscode.commands.registerCommand('tekton.custom.explorer.removeItem', () => removeItemFromCustomTree('tekton.custom.explorer.removeItem')),
    vscode.commands.registerCommand('k8s.tekton.run.logs', k8sCommands.showLogs),
    vscode.commands.registerCommand('k8s.tekton.run.followLogs', k8sCommands.followLogs),
    vscode.commands.registerCommand('tekton.open.condition', (context) => execute(TaskRun.openConditionDefinition, context, 'tekton.open.condition')),
    vscode.commands.registerCommand('tekton.open.task', (context) => execute(TaskRun.openDefinition, context, 'tekton.open.task')),
    vscode.commands.registerCommand('tekton.open.task.palette', (context) => execute(TaskRun.openDefinition, context, 'tekton.open.task.palette')),
    vscode.commands.registerCommand('tekton.view.pipelinerun.diagram', (context) => execute(PipelineRun.showDiagram, context)),
    vscode.commands.registerCommand('tekton.taskrun.template', (context) => execute(openTaskRunTemplate, context, 'tekton.taskrun.template')),
    vscode.commands.registerCommand('tekton.taskrun.debug', (context) => execute(debug, context, 'tekton.taskrun.debug')),
    vscode.commands.registerCommand('debug.continue', (context) => execute(showDebugContinue, context, 'debug.continue')),
    vscode.commands.registerCommand('debug.failContinue', (context) => execute(showDebugFailContinue, context, 'debug.failContinue')),
    vscode.commands.registerCommand('debug.exit', (context) => execute(cancelTaskRun, context, 'debug.exit')),
    vscode.commands.registerCommand('debug.terminal', (context) => execute(openContainerInTerminal, context, 'debug.terminal')),

    hubViewProvider,
    vscode.window.registerWebviewViewProvider('tektonHubTasks', hubViewProvider),
    pipelineExplorer,
    debugExplorer,
    registerLogDocumentProvider(),
    // Temporarily loaded resource providers
    vscode.workspace.registerFileSystemProvider(TKN_RESOURCE_SCHEME, tektonVfsProvider, { isCaseSensitive: true, }),
    vscode.workspace.registerFileSystemProvider(TKN_RESOURCE_SCHEME_READONLY, tektonVfsProvider, { isCaseSensitive: true, isReadonly: true }),
  ];
  disposables.forEach((e) => context.subscriptions.push(e));

  detectTknCli().then(() => {
    triggerDetection();
  });
  detectKubectlCli().then(() => {
    checkClusterStatus(true); // watch Tekton resources when all required dependency are installed
  });  
  getClusterVersions().then((version) => {
    const telemetryProps: TelemetryProperties = {
      identifier: 'cluster.version',
    };
    for (const [key, value] of Object.entries(version)) {
      telemetryProps[key] = value;
    }
    sendTelemetry('tekton.cluster.version', telemetryProps)
  })
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

  const configurationApi = await k8s.extension.configuration.v1_1;
  if (configurationApi.available) {
    const confApi = configurationApi.api;
    confApi.onDidChangeContext(() => {
      refreshTreeView();
    });
    confApi.onDidChangeNamespace(() => {
      pipelineTriggerStatus.set('pipeline', false);
      refreshTreeView();
    })
  }
  vscode.workspace.onDidSaveTextDocument(async (document: vscode.TextDocument) => {
    await updateTektonResource(document);
  });
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

async function detectTknCli(): Promise<void> {
  setCommandContext(CommandContext.TknCli, false);

  // start detecting 'tkn' on extension start
  const tknTool = await ToolsConfig.detectOrDownload('tkn');
  if (!tknTool) {
    await vscode.window.showInformationMessage(
      `Cannot find Tkn Cli v${ToolsConfig.tool['tkn'].version}. Please download it and try again`);
    return Promise.reject();
  }

  if (tknTool && tknTool.error === ERR_CLUSTER_TIMED_OUT) {
    await vscode.window.showWarningMessage(
      'The cluster took too long to respond. Please make sure the cluster is running and you can connect to it.');
    return Promise.reject();
  }

  if (tknTool) {
    setCommandContext(CommandContext.TknCli, true);
    sendVersionToTelemetry('tkn.version', tknTool.location);
  }  
}

async function detectKubectlCli(): Promise<void> {
  const toolName = 'kubectl';
  const tool = await ToolsConfig.detectOrDownload('kubectl');
  if (!tool) {
    await vscode.window.showInformationMessage(
      `Cannot find ${toolName} cli v${ToolsConfig.tool['tkn'].version}. Please download it and try again`);
    return Promise.reject();
  }

  if (tool && tool.error === ERR_CLUSTER_TIMED_OUT) {
    await vscode.window.showWarningMessage(
      'The cluster took too long to respond. Please make sure the cluster is running and you can connect to it.');
    return Promise.reject();
  }

  if (tool) {
    sendVersionToTelemetry('kubectl.version', `${ToolsConfig.getToolLocation('kubectl')} -o json`);
  }
}

async function sendVersionToTelemetry(commandId: string, cmd: string): Promise<void> {
  const telemetryProps: TelemetryProperties = {
    identifier: commandId,
  };
  const result = await cli.execute(createCliCommand(`${cmd} version`));
  if (result.error) {
    telemetryLogError(commandId, result.error);
  } else {
    let version: unknown;
    if (commandId === 'tkn.version') {
      version = getVersion(result.stdout);
    } else if (commandId === 'kubectl.version') {
      version = JSON.parse(result.stdout);
    }
    for (const [key, value] of Object.entries(version)) {
      if (commandId === 'tkn.version') {
        telemetryProps[tektonVersionType[key]] = `${value}`;
      } else {
        telemetryProps[key] = `v${value['major']}.${value['minor']}`;
      }
    } 
    sendTknAndKubectlVersionToTelemetry(commandId, telemetryProps);
  }
}

async function sendTknAndKubectlVersionToTelemetry(commandId: string, telemetryProps: TelemetryProperties): Promise<void> {
  sendTelemetry(commandId, telemetryProps);
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

function refreshTreeView(): void {
  if (ToolsConfig.getToolLocation('kubectl')) {
    checkClusterStatus(true);
  }
  pipelineExplorer.refresh();
  debugName.clear();
  if (debugSessions && debugSessions.size !== 0) {
    for (const [key] of debugSessions) {
      deleteDebugger(key);
    }
  }
  debugSessions.clear();
  debugExplorer.refresh();
}
