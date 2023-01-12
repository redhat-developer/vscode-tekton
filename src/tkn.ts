/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { CliCommand, CliExitData, cli, cliCommandToString, WatchProcess } from './cli';
import { TreeItemCollapsibleState, Terminal, workspace } from 'vscode';
import { WindowUtil } from './util/windowUtils';
import * as path from 'path';
import { ToolsConfig } from './tools';
import { TknPipelineResource, TknTask, PipelineRunData, TaskRunStatus, ConditionCheckStatus, PipelineTaskRunData } from './tekton';
import { kubectl } from './kubectl';
import { pipelineExplorer } from './pipeline/pipelineExplorer';
import { RunState } from './yaml-support/tkn-yaml';
import { getStderrString } from './util/stderrstring';
import { ContextType } from './context-type';
import { TektonNode, TektonNodeImpl } from './tree-view/tekton-node';
import { TaskRun } from './tree-view/task-run-node';
import { PipelineRun } from './tree-view/pipelinerun-node';
import { MoreNode } from './tree-view/expand-node';
import { Command } from './cli-command';
import { getPipelineList } from './util/list-tekton-resource';
import { telemetryLog, telemetryLogError } from './telemetry';
import { checkClusterStatus } from './util/check-cluster-status';
import { treeRefresh } from './util/watchResources';
import { SpawnOptions } from 'child_process';
import { ERR_CLUSTER_TIMED_OUT } from './constants';


const tektonResourceCount = {};

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
  restartPipeline(pipeline: TektonNode): Promise<void>;
  getPipelines(pipeline?: TektonNode): Promise<TektonNode[]>;
  getPipelineRuns(pipelineRun?: TektonNode): Promise<TektonNode[]>;
  getPipelineResources(pipelineResources?: TektonNode): Promise<TektonNode[]>;
  getTasks(task?: TektonNode): Promise<TektonNode[]>;
  getRawTasks(): Promise<TknTask[]>;
  getClusterTasks(clustertask?: TektonNode): Promise<TektonNode[]>;
  getRawClusterTasks(): Promise<TknTask[]>;
  executeWithOptions(command: CliCommand, opts?: SpawnOptions, fail?: boolean): Promise<CliExitData>;
  execute(command: CliCommand, cwd?: string, fail?: boolean): Promise<CliExitData>;
  // eslint-disable-next-line @typescript-eslint/ban-types
  executeWatch(command: CliCommand, opts?: {}): WatchProcess;
  executeInTerminal(command: CliCommand, resourceName?: string, cwd?: string): void;
  getTaskRunsForTasks(task: TektonNode): Promise<TektonNode[]>;
  getTaskRunsForClusterTasks(task: TektonNode): Promise<TektonNode[]>;
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
    const clusterInfo = await checkClusterStatus();
    if (clusterInfo !== null) return clusterInfo;
    treeRefresh.set('treeRefresh', true);
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
    if (tektonResourceCount['pipelineRun'] !== data.length) {
      telemetryLog('tekton.list.pipelineRun', `Total number of pipelineRun: ${data.length}`);
      tektonResourceCount['pipelineRun'] = data.length
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
    return this.getSupportedTaskRunTreeView(result, task);
  }

  async getTaskRunsForClusterTasks(clusterTask: TektonNode): Promise<TektonNode[]> {
    if (!clusterTask.visibleChildren) {
      clusterTask.visibleChildren = this.defaultPageSize;
    }
    const taskRun = await this._getTaskRunsForClusterTasks(clusterTask);
    this.getPipelineStatus(taskRun);
    return this.limitView(clusterTask, taskRun);
  }

  async _getTaskRunsForClusterTasks(clusterTask: TektonNode): Promise<TektonNode[]> {
    const result = await this.execute(Command.listTaskRunsForClusterTasks(clusterTask.getName()));
    if (result.error) {
      console.log(result + ' Std.err when processing taskruns for ' + clusterTask.getName());
      return [new TektonNodeImpl(clusterTask, getStderrString(result.error), ContextType.TASKRUN, this, TreeItemCollapsibleState.None)];
    }
    return this.getSupportedTaskRunTreeView(result, clusterTask);
  }

  async getSupportedTaskRunTreeView(result: CliExitData, taskRef: TektonNode): Promise<TektonNode[]> {
    let data: PipelineTaskRunData[] = [];
    try {
      data = JSON.parse(result.stdout).items;
      // eslint-disable-next-line no-empty
    } catch (ignore) {
    }
    return data
      .map((value) => new TaskRun(taskRef, value.metadata.name, this, value))
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
    if (tektonResourceCount['taskRun'] !== data.length) {
      telemetryLog('tekton.list.taskRun', `Total number of taskRun: ${data.length}`);
      tektonResourceCount['taskRun'] = data.length
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
    if (tektonResourceCount['pipeline'] !== pipelineList.length) {
      telemetryLog('tekton.list.pipeline', `Total number of Pipeline: ${pipelineList.length}`);
      tektonResourceCount['pipeline'] = pipelineList.length
    }
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
    const pipelineResources: NameId[] = data.map((value) => {
      return {
        name: value.metadata.name,
        uid: value.metadata.uid
      }
    });
    if (tektonResourceCount['pipelineResource'] !== pipelineResources.length) {
      telemetryLog('tekton.list.pipelineresource', `Total number of PipelineResource: ${pipelineResources.length}`);
      tektonResourceCount['pipelineResource'] = pipelineResources.length;
    }
    return pipelineResources.map<TektonNode>((value) => new TektonNodeImpl(pipelineResource, value.name, ContextType.PIPELINERESOURCE, this, TreeItemCollapsibleState.None, value.uid)).sort(compareNodes);
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
    if (tektonResourceCount['condition'] !== condition.length) {
      telemetryLog('tekton.list.condition', `Total number of Condition: ${condition.length}`);
      tektonResourceCount['condition'] = condition.length;
    }
    condition = [...new Set(condition)];
    return condition.map<TektonNode>((value) => new TektonNodeImpl(conditionResource, value.name, conditionContextType, this, TreeItemCollapsibleState.None, value.uid)).sort(compareNodes);
  }

  async getTriggerTemplates(triggerTemplatesNode: TektonNode): Promise<TektonNode[]> {
    return this._getTriggerResource(triggerTemplatesNode, Command.listTriggerTemplates(), ContextType.TRIGGERTEMPLATES, 'TriggerTemplates');
  }

  async getTriggerBinding(triggerBindingNode: TektonNode): Promise<TektonNode[]> {
    return this._getTriggerResource(triggerBindingNode, Command.listTriggerBinding(), ContextType.TRIGGERBINDING, 'TriggerBinding');
  }

  async getEventListener(eventListenerNode: TektonNode): Promise<TektonNode[]> {
    return this._getTriggerResource(eventListenerNode, Command.listEventListener(), ContextType.EVENTLISTENER, 'EventListener');
  }

  async getClusterTriggerBinding(clusterTriggerBindingNode: TektonNode): Promise<TektonNode[]> {
    return this._getTriggerResource(clusterTriggerBindingNode, Command.listClusterTriggerBinding(), ContextType.CLUSTERTRIGGERBINDING, 'ClusterTriggerBinding');
  }

  private async _getTriggerResource(trigerResource: TektonNode, command: CliCommand, triggerContextType: ContextType, triggerType: string): Promise<TektonNode[]> {
    let data: TknPipelineResource[] = [];
    const result = await this.execute(command, process.cwd(), false);
    const triggerCheck = RegExp('error: the server doesn\'t have a resource type');
    if (triggerCheck.test(getStderrString(result.error))) {
      telemetryLogError(`tekton.list.${triggerType}`, result.error);
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
    if (tektonResourceCount[triggerType] !== trigger.length) {
      telemetryLog(`tekton.list.${triggerType}`, `Total number of ${triggerType}: ${trigger.length}`);
      tektonResourceCount[triggerType] = trigger.length;
    }
    return trigger.map<TektonNode>((value) => new TektonNodeImpl(trigerResource, value.name, triggerContextType, this, TreeItemCollapsibleState.None, value.uid)).sort(compareNodes);
  }

  public async getTasks(task: TektonNode): Promise<TektonNode[]> {
    return this._getTasks(task);
  }

  async _getTasks(task: TektonNode): Promise<TektonNode[]> {
    let data: TknTask[] = [];
    const result = await this.execute(Command.listTasks());
    if (result.error) {
      telemetryLogError('tekton.list.task', result.error);
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
    if (tektonResourceCount['task'] !== tasks.length) {
      telemetryLog('tekton.list.task', `Total number of Task: ${tasks.length}`);
      tektonResourceCount['task'] = tasks.length;
    }
    tasks = [...new Set(tasks)];
    return tasks.map<TektonNode>((value) => new TektonNodeImpl(task, value.name, ContextType.TASK, this, TreeItemCollapsibleState.Collapsed, value.uid)).sort(compareNodes);
  }

  async getRawTasks(): Promise<TknTask[]> {
    let data: TknTask[] = [];
    if (!ToolsConfig.getToolLocation('kubectl')) return null;
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
    if (tektonResourceCount['ClusterTask'] !== tasks.length) {
      telemetryLog('tekton.list.clusterTask', `Total number of ClusterTask: ${tasks.length}`);
      tektonResourceCount['ClusterTask'] = tasks.length;
    }
    tasks = [...new Set(tasks)];
    return tasks.map<TektonNode>((value) => new TektonNodeImpl(clustertask, value.name, ContextType.CLUSTERTASK, this, TreeItemCollapsibleState.Collapsed, value.uid)).sort(compareNodes);
  }

  async getRawClusterTasks(): Promise<TknTask[]> {
    let data: TknTask[] = [];
    if (!ToolsConfig.getToolLocation('kubectl')) return null;
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

  async restartPipeline(pipeline: TektonNode): Promise<void> {
    await this.executeInTerminal(Command.restartPipeline(pipeline.getName()));
  }

  async getRawTask(name: string, type: 'Task' | 'ClusterTask' = 'Task'): Promise<TknTask | undefined> {
    let data: TknTask;
    const result = await this.execute(Command.getTask(name, type === 'Task' ? 'task.tekton' : 'clustertask'));
    if (result.error) {
      console.log(result + 'Std.err when processing tasks');
      return data;
    }
    try {
      data = JSON.parse(result.stdout);
      // eslint-disable-next-line no-empty
    } catch (ignore) {
    }

    return data;
  }

  async executeInTerminal(command: CliCommand, resourceName?: string, cwd: string = process.cwd(), name = 'Tekton'): Promise<void> {
    const toolConfig = await ToolsConfig.detectOrDownload(command.cliCommand);
    if (!toolConfig || toolConfig.error == ERR_CLUSTER_TIMED_OUT) {
      return;
    }
    const toolLocation = path.dirname(toolConfig.location);
    let terminal: Terminal;
    if (resourceName) {
      terminal = WindowUtil.createTerminal(`${name}:${resourceName}`, cwd, toolLocation);
    } else {
      terminal = WindowUtil.createTerminal(name, cwd, toolLocation);
    }
    terminal.sendText(cliCommandToString(command), true);
    terminal.show();
  }

  async executeWithOptions(command: CliCommand, opts?: SpawnOptions, fail?: boolean): Promise<CliExitData> {
    const cleanedCommand = await this.createCliCommand(command);
    if (typeof cleanedCommand === 'string') {
      return {
        error: cleanedCommand,
        stdout: undefined
      }; 
    }

    return cli.execute(command, opts ? opts : {})
      .then(async (result) => result.error && fail ? Promise.reject(result.error) : result)
      .catch((err) => fail ? Promise.reject(err) : Promise.resolve({ error: null, stdout: '', stderr: '' }));
  }

  async execute(command: CliCommand, cwd?: string, fail = true): Promise<CliExitData> {
    return this.executeWithOptions(command, cwd ? { cwd } : {}, fail);
  }

  async createCliCommand(command: CliCommand): Promise<CliCommand | string> {
    if (command.cliCommand.indexOf('tkn') >= 0) {
      const toolLocation = ToolsConfig.getToolLocation('tkn');
      if (toolLocation) {
        command.cliCommand = command.cliCommand.replace('tkn', `"${toolLocation}"`).replace(new RegExp('&& tkn', 'g'), `&& "${toolLocation}"`);
      }
    } else {
      const toolConfig = await ToolsConfig.detectOrDownload(command.cliCommand);
      if (toolConfig) {
        if (toolConfig.error === ERR_CLUSTER_TIMED_OUT) {
          return toolConfig.error;
        }
        if (toolConfig.location) {
          command.cliCommand = command.cliCommand.replace(command.cliCommand, `"${toolConfig.location}"`).replace(new RegExp(`&& ${command.cliCommand}`, 'g'), `&& "${toolConfig.location}"`);
        }
      }
    }
    return command;
  }

  executeWatch(command: CliCommand, cwd?: string): WatchProcess {
    const toolLocation = ToolsConfig.getToolLocation(command.cliCommand);
    if (toolLocation) {
      // eslint-disable-next-line require-atomic-updates
      command.cliCommand = command.cliCommand.replace(command.cliCommand, `"${toolLocation}"`).replace(new RegExp(`&& ${command.cliCommand}`, 'g'), `&& "${toolLocation}"`);
    }

    return cli.executeWatch(command, cwd ? { cwd } : {});
  }

}

export const tkn = new TknImpl();
