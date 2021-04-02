/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { CliCommand, CliExitData, cli, cliCommandToString, WatchProcess } from './cli';
import { TreeItemCollapsibleState, Terminal, workspace } from 'vscode';
import { WindowUtil } from './util/windowUtils';
import * as path from 'path';
import { ToolsConfig } from './tools';
import humanize = require('humanize-duration');
import { TknPipelineResource, TknTask, PipelineRunData, TaskRunStatus, ConditionCheckStatus, PipelineTaskRunData } from './tekton';
import { kubectl } from './kubectl';
import { pipelineExplorer } from './pipeline/pipelineExplorer';
import { StartObject } from './tekton/pipelinecontent';
import { RunState } from './yaml-support/tkn-yaml';
import { version } from './util/tknversion';
import { pipelineTriggerStatus, watchResources } from './util/watchResources';
import { getStderrString } from './util/stderrstring';
import { ContextType } from './context-type';
import { TektonNode, TektonNodeImpl } from './tree-view/tekton-node';
import { TaskRun } from './tree-view/task-run-node';
import { PipelineRun } from './tree-view/pipelinerun-node';
import { MoreNode } from './tree-view/expand-node';
import { Command } from './cli-command';
import { getPipelineList } from './util/list-tekton-resource';

export const humanizer = humanize.humanizer(createConfig());

function createConfig(): humanize.HumanizerOptions {
  return {
    language: 'shortEn',
    languages: {
      shortEn: {
        y: () => 'y',
        mo: () => 'mo',
        w: () => 'w',
        d: () => 'd',
        h: () => 'h',
        m: () => 'm',
        s: () => 's',
        ms: () => 'ms',
      }
    },
    round: true,
    largest: 2,
    conjunction: ' '
  };
}

interface NameId {
  name: string;
  uid: string;
}

export function getPipelineRunTaskState(status: TaskRunStatus | ConditionCheckStatus): RunState {
  let result: RunState = 'Unknown';
  if (!status) {
    return result; // default state
  }
  const startTime = status.startTime;
  if (startTime) {
    result = 'Started';
  }
  const conditionStatus = status.conditions;
  if (conditionStatus) {
    const status = conditionStatus[0]?.status;
    if (status) {
      if (status === 'True') {
        result = 'Finished';
      } else if (status === 'False') {
        const reason = conditionStatus[0]?.reason;
        if (reason === 'TaskRunCancelled') {
          result = 'Cancelled';
        } else {
          result = 'Failed';
        }
      } else if (status === 'Unknown') {
        result = 'Unknown';
      }
    }
  }
  return result;
}

export interface Tkn {
  getPipelineNodes(): Promise<TektonNode[]>;
  startPipeline(pipeline: StartObject): Promise<string>;
  startTask(task: StartObject): Promise<TektonNode[]>;
  restartPipeline(pipeline: TektonNode): Promise<void>;
  getPipelines(pipeline?: TektonNode): Promise<TektonNode[]>;
  getPipelineRuns(pipelineRun?: TektonNode): Promise<TektonNode[]>;
  getPipelineResources(pipelineResources?: TektonNode): Promise<TektonNode[]>;
  getTasks(task?: TektonNode): Promise<TektonNode[]>;
  getRawTasks(): Promise<TknTask[]>;
  getClusterTasks(clustertask?: TektonNode): Promise<TektonNode[]>;
  getRawClusterTasks(): Promise<TknTask[]>;
  execute(command: CliCommand, cwd?: string, fail?: boolean): Promise<CliExitData>;
  executeWatch(command: CliCommand, opts?: {}): WatchProcess;
  executeInTerminal(command: CliCommand, cwd?: string): void;
  getTaskRunsForTasks(task: TektonNode): Promise<TektonNode[]>;
  getTriggerTemplates(triggerTemplates?: TektonNode): Promise<TektonNode[]>;
  getTriggerBinding(triggerBinding?: TektonNode): Promise<TektonNode[]>;
  getClusterTriggerBinding(clusterTriggerBinding: TektonNode): Promise<TektonNode[]>;
  getEventListener(EventListener?: TektonNode): Promise<TektonNode[]>;
  getConditions(conditions?: TektonNode): Promise<TektonNode[]>;
  getPipelineRunsList(pipelineRun?: TektonNode): Promise<TektonNode[]>;
  getTaskRunList(taskRun?: TektonNode): Promise<TektonNode[]>;
  getRawPipelineRun(name: string): Promise<PipelineRunData | undefined>;
  getLatestPipelineRun(pipelineName: string): Promise<TektonNode[]> | undefined;
  clearCache?(): void;
}

function compareNodes(a, b): number {
  if (!a.contextValue) { return -1; }
  if (!b.contextValue) { return 1; }
  const t = a.contextValue.localeCompare(b.contextValue);
  return t ? t : a.label.localeCompare(b.label);
}

export function compareTimeNewestFirst(a: TektonNode, b: TektonNode): number {
  const aTime = Date.parse(a.creationTime);
  const bTime = Date.parse(b.creationTime);
  return aTime < bTime ? 1 : -1;
}

const nodeToRefresh = ['TaskRuns', 'ClusterTasks', 'Tasks'];
export class TknImpl implements Tkn {

  public static ROOT: TektonNode = new TektonNodeImpl(undefined, 'root', undefined, undefined);

  // Get page size from configuration, in case configuration is not present(dev mode) use hard coded value
  defaultPageSize: number = workspace.getConfiguration('vs-tekton').has('treePaginationLimit') ? workspace.getConfiguration('vs-tekton').get('treePaginationLimit') : 5;

  async getPipelineNodes(): Promise<TektonNode[]> {
    const result: CliExitData = await this.execute(
      Command.checkTekton(), process.cwd(), false
    );
    const kubectlCheck = RegExp('kubectl:\\s*command not found');
    if (kubectlCheck.test(getStderrString(result.error))) {
      const tknMessage = 'Please install kubectl.';
      watchResources.disableWatch();
      return [new TektonNodeImpl(null, tknMessage, ContextType.TKN_DOWN, this, TreeItemCollapsibleState.None)]
    }
    if (result.stdout.trim() === 'no') {
      const tknDownMsg = 'The current user doesn\'t have the privileges to interact with tekton resources.';
      watchResources.disableWatch();
      return [new TektonNodeImpl(null, tknDownMsg, ContextType.TKN_DOWN, this, TreeItemCollapsibleState.None)];
    }
    if (result.error && getStderrString(result.error).indexOf('You must be logged in to the server (Unauthorized)') > -1) {
      const tknMessage = 'Please login to the server.';
      watchResources.disableWatch();
      return [new TektonNodeImpl(null, tknMessage, ContextType.TKN_DOWN, this, TreeItemCollapsibleState.None)]
    }
    if (result.error && getStderrString(result.error).indexOf('the server doesn\'t have a resource type \'pipeline\'') > -1) {
      const tknDownMsg = 'Please install the OpenShift Pipelines Operator.';
      watchResources.disableWatch();
      return [new TektonNodeImpl(null, tknDownMsg, ContextType.TKN_DOWN, this, TreeItemCollapsibleState.None)];
    }
    const serverCheck = RegExp('Unable to connect to the server');
    if (serverCheck.test(getStderrString(result.error))) {
      const loginError = 'Unable to connect to OpenShift cluster, is it down?';
      watchResources.disableWatch();
      return [new TektonNodeImpl(null, loginError, ContextType.TKN_DOWN, this, TreeItemCollapsibleState.None)];
    }

    const tknVersion = await version();

    if (tknVersion && (tknVersion?.trigger === undefined || tknVersion.trigger.trim() === 'unknown')) {
      pipelineTriggerStatus.set('trigger', false);
    }
    if (!pipelineTriggerStatus.get('pipeline')) {
      const resourceList = ['pipeline', 'pipelinerun', 'taskrun', 'task', 'clustertask', 'pipelineresources', 'condition'];
      watchResources.watchCommand(resourceList);
      pipelineTriggerStatus.set('pipeline', true);
    }
    if (!pipelineTriggerStatus.get('trigger') && tknVersion && tknVersion?.trigger !== undefined && tknVersion.trigger.trim() !== 'unknown') {
      const resourceList = ['tt', 'tb', 'el', 'ctb'];
      watchResources.watchCommand(resourceList);
      pipelineTriggerStatus.set('trigger', true);
    }
    return this._getPipelineNodes();
  }

  public _getPipelineNodes(): TektonNode[] {
    const pipelineTree: TektonNode[] = [];
    const pipelineNode = new TektonNodeImpl(TknImpl.ROOT, 'Pipelines', ContextType.PIPELINENODE, this, TreeItemCollapsibleState.Collapsed);
    const pipelineRunNode = new TektonNodeImpl(TknImpl.ROOT, 'PipelineRuns', ContextType.PIPELINERUNNODE, this, TreeItemCollapsibleState.Collapsed);
    const taskNode = new TektonNodeImpl(TknImpl.ROOT, 'Tasks', ContextType.TASKNODE, this, TreeItemCollapsibleState.Collapsed);
    const clustertaskNode = new TektonNodeImpl(TknImpl.ROOT, 'ClusterTasks', ContextType.CLUSTERTASKNODE, this, TreeItemCollapsibleState.Collapsed);
    const taskRunNode = new TektonNodeImpl(TknImpl.ROOT, 'TaskRuns', ContextType.TASKRUNNODE, this, TreeItemCollapsibleState.Collapsed);
    const pipelineResourceNode = new TektonNodeImpl(TknImpl.ROOT, 'PipelineResources', ContextType.PIPELINERESOURCENODE, this, TreeItemCollapsibleState.Collapsed);
    const triggerTemplatesNode = new TektonNodeImpl(TknImpl.ROOT, 'TriggerTemplates', ContextType.TRIGGERTEMPLATESNODE, this, TreeItemCollapsibleState.Collapsed);
    const triggerBindingNode = new TektonNodeImpl(TknImpl.ROOT, 'TriggerBinding', ContextType.TRIGGERBINDINGNODE, this, TreeItemCollapsibleState.Collapsed);
    const eventListenerNode = new TektonNodeImpl(TknImpl.ROOT, 'EventListener', ContextType.EVENTLISTENERNODE, this, TreeItemCollapsibleState.Collapsed);
    const clusterTriggerBindingNode = new TektonNodeImpl(TknImpl.ROOT, 'ClusterTriggerBinding', ContextType.CLUSTERTRIGGERBINDINGNODE, this, TreeItemCollapsibleState.Collapsed);
    const conditionsNode = new TektonNodeImpl(TknImpl.ROOT, 'Conditions', ContextType.CONDITIONSNODE, this, TreeItemCollapsibleState.Collapsed);
    pipelineTree.push(pipelineNode, pipelineRunNode, taskNode, clustertaskNode, taskRunNode, pipelineResourceNode, triggerTemplatesNode, triggerBindingNode, eventListenerNode, conditionsNode, clusterTriggerBindingNode);
    TknImpl.ROOT.getChildren = () => pipelineTree; // TODO: fix me
    return pipelineTree;
  }

  async refreshPipelineRun(tknResource: TektonNode, resourceName: string): Promise<void> {
    await kubectl.watchRunCommand(Command.watchResources(resourceName, tknResource.getName()), () => {
      if (tknResource.contextValue === 'pipelinerun') {
        pipelineExplorer.refresh(tknResource);
        for (const item of TknImpl.ROOT.getChildren() as TektonNodeImpl[]) {
          if (nodeToRefresh.includes(item.getName())) {
            pipelineExplorer.refresh(item);
          }
        }
      }
    });
    (tknResource.contextValue === 'taskrun') ? pipelineExplorer.refresh(tknResource.getParent()) : pipelineExplorer.refresh(); // refresh all tree
  }

  async getPipelineStatus(listOfResources: TektonNode[]): Promise<void> {
    for (const tknResource of listOfResources) {
      if (tknResource.state === 'Unknown') {
        this.refreshPipelineRun(tknResource, tknResource.contextValue);
      }
    }
  }

  async limitView(context: TektonNode, tektonNode: TektonNode[]): Promise<TektonNode[]> {
    if (!context) return tektonNode;
    const currentRuns = tektonNode.slice(0, Math.min(context.visibleChildren, tektonNode.length))
    if (context.visibleChildren < tektonNode.length) {
      let nextPage = this.defaultPageSize;
      if (context.visibleChildren + this.defaultPageSize > tektonNode.length) {
        nextPage = tektonNode.length - context.visibleChildren;
      }
      currentRuns.push(new MoreNode(nextPage, tektonNode.length, context));
    }
    return currentRuns;
  }

  async getPipelineRunsList(pipelineRun: TektonNode): Promise<TektonNode[]> {
    if (pipelineRun && !pipelineRun.visibleChildren) {
      pipelineRun.visibleChildren = this.defaultPageSize;
    }
    const pipelineRunList = await this._getPipelineRunsList(pipelineRun);
    return this.limitView(pipelineRun, pipelineRunList);
  }

  async _getPipelineRunsList(pipelineRun: TektonNode): Promise<TektonNode[]> | undefined {
    const result = await this.execute(Command.listPipelineRun());
    if (result.error) {
      console.log(result + ' Std.err when processing pipelines');
      return [new TektonNodeImpl(pipelineRun, getStderrString(result.error), ContextType.PIPELINERUNNODE, this, TreeItemCollapsibleState.None)];
    }

    let data: PipelineRunData[] = [];
    try {
      const r = JSON.parse(result.stdout);
      data = r.items ? r.items : data;
      // eslint-disable-next-line no-empty
    } catch (ignore) {
    }

    return data.map((value) => new PipelineRun(pipelineRun, value.metadata.name, this, value, TreeItemCollapsibleState.None)).sort(compareTimeNewestFirst);
  }

  async getPipelineRuns(pipeline: TektonNode): Promise<TektonNode[]> {
    if (!pipeline.visibleChildren) {
      pipeline.visibleChildren = this.defaultPageSize;
    }

    const pipelineRuns = await this._getPipelineRuns(pipeline);

    this.getPipelineStatus(pipelineRuns);
    return this.limitView(pipeline, pipelineRuns);
  }

  async getLatestPipelineRun(pipelineName: string): Promise<TektonNode[]> {
    return await this._getPipelineRuns(null, pipelineName);
  }

  async _getPipelineRuns(pipeline: TektonNode, pipelineName?: string): Promise<TektonNode[]> | undefined {
    const result = await this.execute(Command.listPipelineRuns(pipelineName ?? pipeline.getName()));
    if (result.error) {
      console.log(result + ' Std.err when processing pipelines');
      if (!pipelineName) return [new TektonNodeImpl(pipeline, getStderrString(result.error), ContextType.PIPELINERUN, this, TreeItemCollapsibleState.None)];
    }

    let data: PipelineRunData[] = [];
    try {
      const r = JSON.parse(result.stdout);
      data = r.items ? r.items : data;
      // eslint-disable-next-line no-empty
    } catch (ignore) {
    }

    return data
      .map((value) => new PipelineRun(pipeline, value.metadata.name, this, value, TreeItemCollapsibleState.Collapsed))
      .sort(compareTimeNewestFirst);
  }

  async getTaskRunsForTasks(task: TektonNode): Promise<TektonNode[]> {
    if (!task.visibleChildren) {
      task.visibleChildren = this.defaultPageSize;
    }
    const taskRun = await this._getTaskRunsForTasks(task);
    this.getPipelineStatus(taskRun);
    return this.limitView(task, taskRun);
  }

  async _getTaskRunsForTasks(task: TektonNode): Promise<TektonNode[]> {
    const result = await this.execute(Command.listTaskRunsForTasks(task.getName()));
    if (result.error) {
      console.log(result + ' Std.err when processing taskruns for ' + task.getName());
      return [new TektonNodeImpl(task, getStderrString(result.error), ContextType.TASKRUN, this, TreeItemCollapsibleState.None)];
    }
    let data: PipelineTaskRunData[] = [];
    try {
      data = JSON.parse(result.stdout).items;
      // eslint-disable-next-line no-empty
    } catch (ignore) {
    }
    return data
      .map((value) => new TaskRun(task, value.metadata.name, this, value))
      .sort(compareTimeNewestFirst);
  }

  async getTaskRunList(taskRun: TektonNode): Promise<TektonNode[]> {
    if (taskRun && !taskRun.visibleChildren) {
      taskRun.visibleChildren = this.defaultPageSize;
    }
    const taskRunList = await this._getTaskRunList(taskRun);
    return this.limitView(taskRun, taskRunList);
  }

  async _getTaskRunList(taskRun: TektonNode): Promise<TektonNode[]> | undefined {
    const result = await this.execute(Command.listTaskRun());
    if (result.error) {
      return [new TektonNodeImpl(taskRun, getStderrString(result.error), ContextType.TASKRUNNODE, this, TreeItemCollapsibleState.None)];
    }

    let data: PipelineTaskRunData[] = [];
    try {
      const r = JSON.parse(result.stdout);
      data = r.items ? r.items : data;
      // eslint-disable-next-line no-empty
    } catch (ignore) {
    }

    return data.map((value) => new TaskRun(taskRun, value.metadata.name, this, value)).sort(compareTimeNewestFirst);
  }


  async getPipelines(pipeline: TektonNode): Promise<TektonNode[]> {
    return this._getPipelines(pipeline);
  }

  async _getPipelines(pipeline: TektonNode): Promise<TektonNode[]> {
    const pipelineList = await getPipelineList();
    let pipelines: NameId[] = pipelineList.map((value) => {
      return {
        name: value.metadata.name,
        uid: value.metadata.uid
      }
    });
    pipelines = [...new Set(pipelines)];
    return pipelines.map<TektonNode>((value) => new TektonNodeImpl(pipeline, value.name, ContextType.PIPELINE, this, TreeItemCollapsibleState.Collapsed, value.uid)).sort(compareNodes);
  }

  async getPipelineResources(pipelineResources: TektonNode): Promise<TektonNode[]> {
    return this._getPipelineResources(pipelineResources);
  }

  private async _getPipelineResources(pipelineResource: TektonNode): Promise<TektonNode[]> {
    let data: TknPipelineResource[] = [];
    const result = await this.execute(Command.listPipelineResources(), process.cwd(), false);
    if (result.error) {
      console.log(result + ' Std.err when processing pipelines');
      return [new TektonNodeImpl(pipelineResource, getStderrString(result.error), ContextType.PIPELINERESOURCE, this, TreeItemCollapsibleState.Expanded)];
    }
    try {
      data = JSON.parse(result.stdout).items;
    } catch (ignore) {
      //show no pipelines if output is not correct json
    }
    const pipelineresources: NameId[] = data.map((value) => {
      return {
        name: value.metadata.name,
        uid: value.metadata.uid
      }
    });
    return pipelineresources.map<TektonNode>((value) => new TektonNodeImpl(pipelineResource, value.name, ContextType.PIPELINERESOURCE, this, TreeItemCollapsibleState.None, value.uid)).sort(compareNodes);
  }

  async getConditions(conditionsNode: TektonNode): Promise<TektonNode[]> {
    return this._getConditions(conditionsNode, Command.listConditions(), ContextType.CONDITIONS);
  }

  private async _getConditions(conditionResource: TektonNode, command: CliCommand, conditionContextType: ContextType): Promise<TektonNode[]> {
    let data: TknPipelineResource[] = [];
    const result = await this.execute(command, process.cwd(), false);
    if (result.error) {
      return [new TektonNodeImpl(conditionResource, getStderrString(result.error), conditionContextType, this, TreeItemCollapsibleState.Expanded)];
    }
    try {
      data = JSON.parse(result.stdout).items;
    } catch (ignore) {
      //show no pipelines if output is not correct json
    }
    let condition: NameId[] = data.map((value) => {
      return {
        name: value.metadata.name,
        uid: value.metadata.uid
      }
    });
    condition = [...new Set(condition)];
    return condition.map<TektonNode>((value) => new TektonNodeImpl(conditionResource, value.name, conditionContextType, this, TreeItemCollapsibleState.None, value.uid)).sort(compareNodes);
  }

  async getTriggerTemplates(triggerTemplatesNode: TektonNode): Promise<TektonNode[]> {
    return this._getTriggerResource(triggerTemplatesNode, Command.listTriggerTemplates(), ContextType.TRIGGERTEMPLATES);
  }

  async getTriggerBinding(triggerBindingNode: TektonNode): Promise<TektonNode[]> {
    return this._getTriggerResource(triggerBindingNode, Command.listTriggerBinding(), ContextType.TRIGGERBINDING);
  }

  async getEventListener(eventListenerNode: TektonNode): Promise<TektonNode[]> {
    return this._getTriggerResource(eventListenerNode, Command.listEventListener(), ContextType.EVENTLISTENER);
  }

  async getClusterTriggerBinding(clusterTriggerBindingNode: TektonNode): Promise<TektonNode[]> {
    return this._getTriggerResource(clusterTriggerBindingNode, Command.listClusterTriggerBinding(), ContextType.CLUSTERTRIGGERBINDING);
  }

  private async _getTriggerResource(trigerResource: TektonNode, command: CliCommand, triggerContextType: ContextType): Promise<TektonNode[]> {
    let data: TknPipelineResource[] = [];
    const result = await this.execute(command, process.cwd(), false);
    const triggerCheck = RegExp('undefinederror: the server doesn\'t have a resource type');
    if (triggerCheck.test(getStderrString(result.error))) {
      return;
    }
    try {
      data = JSON.parse(result.stdout).items;
    } catch (ignore) {
      //show no pipelines if output is not correct json
    }
    let trigger: NameId[] = data.map((value) => {
      return {
        name: value.metadata.name,
        uid: value.metadata.uid
      }
    });
    trigger = [...new Set(trigger)];
    return trigger.map<TektonNode>((value) => new TektonNodeImpl(trigerResource, value.name, triggerContextType, this, TreeItemCollapsibleState.None, value.uid)).sort(compareNodes);
  }

  public async getTasks(task: TektonNode): Promise<TektonNode[]> {
    return this._getTasks(task);
  }

  async _getTasks(task: TektonNode): Promise<TektonNode[]> {
    let data: TknTask[] = [];
    const result = await this.execute(Command.listTasks());
    if (result.error) {
      console.log(result + 'Std.err when processing tasks');
      return [new TektonNodeImpl(task, getStderrString(result.error), ContextType.TASK, this, TreeItemCollapsibleState.Expanded)];
    }
    try {
      data = JSON.parse(result.stdout).items;
      // eslint-disable-next-line no-empty
    } catch (ignore) {
    }
    let tasks: NameId[] = data.map((value) => {
      return {
        name: value.metadata.name,
        uid: value.metadata.uid
      }
    });
    tasks = [...new Set(tasks)];
    return tasks.map<TektonNode>((value) => new TektonNodeImpl(task, value.name, ContextType.TASK, this, TreeItemCollapsibleState.Collapsed, value.uid)).sort(compareNodes);
  }

  async getRawTasks(): Promise<TknTask[]> {
    let data: TknTask[] = [];
    const result = await this.execute(Command.listTasks());
    if (result.error) {
      console.error(result + 'Std.err when processing tasks');
      return data;
    }
    try {
      data = JSON.parse(result.stdout).items;
      // eslint-disable-next-line no-empty
    } catch (ignore) {
    }

    return data;
  }

  async getRawPipelineRun(name: string): Promise<PipelineRunData | undefined> {
    const result = await this.execute(Command.getPipelineRun(name));
    let data: PipelineRunData;
    if (result.error) {
      console.error(result + 'Std.err when processing tasks');
      return undefined;
    }
    try {
      data = JSON.parse(result.stdout);
      // eslint-disable-next-line no-empty
    } catch (ignore) {
    }

    return data;
  }

  async getClusterTasks(clustertask: TektonNode): Promise<TektonNode[]> {
    return this._getClusterTasks(clustertask);
  }

  async _getClusterTasks(clustertask: TektonNode): Promise<TektonNode[]> {
    let data: TknTask[] = [];
    try {
      const result = await this.execute(Command.listClusterTasks());
      data = JSON.parse(result.stdout).items;
      // eslint-disable-next-line no-empty
    } catch (ignore) {

    }
    let tasks: NameId[] = data.map((value) => {
      return {
        name: value.metadata.name,
        uid: value.metadata.uid
      }
    });
    tasks = [...new Set(tasks)];
    return tasks.map<TektonNode>((value) => new TektonNodeImpl(clustertask, value.name, ContextType.CLUSTERTASK, this, TreeItemCollapsibleState.Collapsed, value.uid)).sort(compareNodes);
  }

  async getRawClusterTasks(): Promise<TknTask[]> {
    let data: TknTask[] = [];
    const result = await this.execute(Command.listClusterTasks());
    if (result.error) {
      console.log(result + 'Std.err when processing tasks');
      return data;
    }
    try {
      data = JSON.parse(result.stdout).items;
      // eslint-disable-next-line no-empty
    } catch (ignore) {
    }

    return data;
  }

  async startPipeline(pipeline: StartObject): Promise<string> {
    const result = await this.execute(Command.startPipeline(pipeline));
    return result.stdout.match(/Pipelinerun|PipelineRun started:\s+([a-z0-9A-Z-]+)/)[1];
  }

  async startTask(task: StartObject): Promise<TektonNode[]> {
    const result = await this.execute(Command.startTask(task));
    let data: TknTask[] = [];
    try {
      data = JSON.parse(result.stdout).items;
      // eslint-disable-next-line no-empty
    } catch (ignore) {
    }
    let tasks: NameId[] = data.map((value) => {
      return {
        name: value.metadata.name,
        uid: value.metadata.uid
      }
    });
    tasks = [...new Set(tasks)];
    return tasks.map<TektonNode>((value) => new TektonNodeImpl(undefined, value.name, ContextType.PIPELINE, this, TreeItemCollapsibleState.None, value.uid)).sort(compareNodes);
  }

  async restartPipeline(pipeline: TektonNode): Promise<void> {
    await this.executeInTerminal(Command.restartPipeline(pipeline.getName()));
  }

  async executeInTerminal(command: CliCommand, cwd: string = process.cwd(), name = 'Tekton'): Promise<void> {
    let toolLocation = await ToolsConfig.detectOrDownload();
    if (toolLocation) {
      toolLocation = path.dirname(toolLocation);
    }
    const terminal: Terminal = WindowUtil.createTerminal(name, cwd, toolLocation);
    terminal.sendText(cliCommandToString(command), true);
    terminal.show();
  }

  async execute(command: CliCommand, cwd?: string, fail = true): Promise<CliExitData> {
    if (command.cliCommand.indexOf('tkn') >= 0) {
      const toolLocation = ToolsConfig.getTknLocation();
      if (toolLocation) {
        // eslint-disable-next-line require-atomic-updates
        command.cliCommand = command.cliCommand.replace('tkn', `"${toolLocation}"`).replace(new RegExp('&& tkn', 'g'), `&& "${toolLocation}"`);
      }
    }

    return cli.execute(command, cwd ? { cwd } : {})
      .then(async (result) => result.error && fail ? Promise.reject(result.error) : result)
      .catch((err) => fail ? Promise.reject(err) : Promise.resolve({ error: null, stdout: '', stderr: '' }));
  }

  executeWatch(command: CliCommand, cwd?: string): WatchProcess {
    if (command.cliCommand.indexOf('tkn') >= 0) {
      const toolLocation = ToolsConfig.getTknLocation();
      if (toolLocation) {
        // eslint-disable-next-line require-atomic-updates
        command.cliCommand = command.cliCommand.replace('tkn', `"${toolLocation}"`).replace(new RegExp('&& tkn', 'g'), `&& "${toolLocation}"`);
      }
    }

    return cli.executeWatch(command, cwd ? { cwd } : {});
  }

}

export const tkn = new TknImpl();
