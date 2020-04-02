/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { CliCommand, CliExitData, Cli, CliImpl, createCliCommand, cliCommandToString } from './cli';
import { ProviderResult, TreeItemCollapsibleState, Terminal, Uri, workspace, TreeItem, Command as vsCommand } from 'vscode';
import { WindowUtil } from './util/windowUtils';
import * as path from 'path';
import { ToolsConfig } from './tools';
import format = require('string-format');
import { StartPipelineObject } from './tekton/pipeline';
import humanize = require('humanize-duration');
import { TknPipelineResource, TknTask, PipelineRunData } from './tekton';
import { kubectl } from './kubectl';
import { pipelineExplorer } from './pipeline/pipelineExplorer';

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


export interface TektonNode {
  contextValue: string;
  creationTime?: string;
  state?: string;
  visibleChildren?: number;
  getChildren(): ProviderResult<TektonNode[]>;
  getParent(): TektonNode | undefined;
  getName(): string;
}

export enum ContextType {
  TASK = 'task',
  TASKRUN = 'taskrun',
  PIPELINE = 'pipeline',
  PIPELINERUN = 'pipelinerun',
  CLUSTERTASK = 'clustertask',
  PIPELINENODE = 'pipelinenode',
  PIPELINERESOURCENODE = 'pipelineresourcenode',
  PIPELINERESOURCE = 'pipelineresource',
  TASKNODE = 'tasknode',
  CLUSTERTASKNODE = 'clustertasknode',
  TKN_DOWN = 'tknDown',
  TRIGGERTEMPLATES = 'triggertemplates',
  TRIGGERBINDING= 'triggerbinding',
  EVENTLISTENER= 'eventlistener',
  CONDITIONS = 'conditions',
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function verbose(_target: any, key: string, descriptor: any): void {
  let fnKey: string | undefined;
  let fn: Function;

  if (typeof descriptor.value === 'function') {
    fnKey = 'value';
    fn = descriptor.value;
  } else {
    throw new Error('not supported');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  descriptor[fnKey] = function (...args: any[]) {
    const v: number = workspace.getConfiguration('vs-tekton').get('outputVerbosityLevel');
    const command: CliCommand = fn.apply(this, args);
    if (v > 0) {
      command.cliArguments.push('-v', v.toString());
    }
    return command;
  };
}

function newTknCommand(...tknArguments: string[]): CliCommand {
  return createCliCommand('tkn', ...tknArguments);
}

export function newK8sCommand(...k8sArguments): CliCommand {
  return createCliCommand('kubectl', ...k8sArguments);
}

export class Command {
  @verbose
  static listTaskRunsforTasks(task: string): CliCommand {
    return newTknCommand('taskrun', 'list', task, '-o', 'json');
  }

  @verbose
  static listTaskRunsforTasksinTerminal(task: string): CliCommand {
    return newTknCommand('taskrun', 'list', task);
  }

  @verbose
  static startPipeline(pipelineData: StartPipelineObject): CliCommand {
    const resources: string[] = [];
    const svcAcct: string[] = pipelineData.serviceAccount ? ['-s ', pipelineData.serviceAccount] : ['-s', 'pipeline'];
    pipelineData.resources.forEach(element => {
      resources.push('--resource');
      resources.push(element.name + '=' + element.resourceRef);
    });

    if (pipelineData.params.length === 0) {
      return newTknCommand('pipeline', 'start', pipelineData.name, ...resources, ...svcAcct);
    }
    else {
      const params: string[] = [];
      pipelineData.params.forEach(element => {
        params.push('--param');
        params.push(element.name + '=' + element.default);
      });
      return newTknCommand('pipeline', 'start', pipelineData.name, ...resources, ...params, ...svcAcct);
    }
  }
  @verbose
  static restartPipeline(name: string): CliCommand {
    return newTknCommand('pipeline', 'start', name, '--last', '-s', 'pipeline');
  }
  @verbose
  static deletePipeline(name: string): CliCommand {
    return newTknCommand('pipeline', 'delete', name, '-f');
  }
  @verbose
  static listPipelineResources(): CliCommand {
    return newTknCommand('resource', 'list', '-o', 'json');
  }
  @verbose
  static listTriggerTemplates(): CliCommand {
    return newTknCommand('triggertemplates', 'list', '-o', 'json');
  }
  @verbose
  static listTriggerBinding(): CliCommand {
    return newTknCommand('triggerbinding', 'list', '-o', 'json');
  }
  @verbose
  static listEventListener(): CliCommand {
    return newTknCommand('eventlistener', 'list', '-o', 'json');
  }
  static deleteTriggerTemplate(name: string): CliCommand {
    return newTknCommand('triggertemplate', 'delete', name, '-f');
  }
  static deleteTriggerBinding(name: string): CliCommand {
    return newTknCommand('triggerbinding', 'delete', name, '-f');
  }
  static deleteEventListeners(name: string): CliCommand {
    return newTknCommand('eventlistener', 'delete', name, '-f');
  }
  @verbose
  static listPipelineResourcesInTerminal(name: string): CliCommand {
    return newTknCommand('resource', 'list', name);
  }
  @verbose
  static describePipelineResource(name: string): CliCommand {
    return newTknCommand('resource', 'describe', name);
  }
  @verbose
  static deletePipelineResource(name: string): CliCommand {
    return newTknCommand('resource', 'delete', name, '-f');
  }
  @verbose
  static listPipelines(): CliCommand {
    return newTknCommand('pipeline', 'list', '-o', 'json');
  }
  @verbose
  static listPipelinesInTerminal(name: string): CliCommand {
    return newTknCommand('pipeline', 'list', name);
  }
  @verbose
  static describePipelines(name: string): CliCommand {
    return newTknCommand('pipeline', 'describe', name);
  }
  @verbose
  static listPipelineRuns(name: string): CliCommand {
    return newTknCommand('pipelinerun', 'list', name, '-o', 'json');
  }
  @verbose
  static listPipelineRunsInTerminal(name: string): CliCommand {
    return newTknCommand('pipelinerun', 'list', name);
  }
  @verbose
  static describePipelineRuns(name: string): CliCommand {
    return newTknCommand('pipelinerun', 'describe', name);
  }
  @verbose
  static cancelPipelineRun(name: string): CliCommand {
    return newTknCommand('pipelinerun', 'cancel', name);
  }
  @verbose
  static deletePipelineRun(name: string): CliCommand {
    return newTknCommand('pipelinerun', 'delete', name, '-f');
  }
  @verbose
  static showPipelineRunLogs(name: string): CliCommand {
    return newTknCommand('pipelinerun', 'logs', name);
  }
  @verbose
  static listTasks(namespace?: string): CliCommand {
    return newTknCommand('task', 'list', ...(namespace ? ['-n', namespace] : ''), '-o', 'json');
  }
  @verbose
  static listTasksinTerminal(namespace?: string): CliCommand {
    return newTknCommand('task', 'list', ...(namespace ? ['-n', namespace] : ''), '-o', 'json');
  }
  @verbose
  static listTaskRuns(namespace?: string): CliCommand {
    return newTknCommand('taskrun', 'list', ...(namespace ? ['-n', namespace] : ''), '-o', 'json');
  }
  @verbose
  static listTaskRunsInTerminal(namespace?: string): CliCommand {
    return newTknCommand('taskrun', 'list', ...(namespace ? ['-n', namespace] : ''));
  }
  @verbose
  static deleteTask(name: string): CliCommand {
    return newTknCommand('task', 'delete', name, '-f');
  }
  @verbose
  static listClusterTasks(namespace?: string): CliCommand {
    return newTknCommand('clustertask', 'list', ...(namespace ? ['-n', namespace] : ''), '-o', 'json');
  }
  static listClusterTasksinTerminal(namespace?: string): CliCommand {
    return newTknCommand('clustertask', 'list', ...(namespace ? ['-n', namespace] : ''));
  }
  @verbose
  static deleteClusterTask(name: string): CliCommand {
    return newTknCommand('clustertask', 'delete', name, '-f');
  }
  @verbose
  static showTaskRunLogs(name: string): CliCommand {
    return newTknCommand('taskrun', 'logs', name);
  }
  @verbose
  static deleteTaskRun(name: string): CliCommand {
    return newTknCommand('taskrun', 'delete', name, '-f');
  }
  @verbose
  static printTknVersion(): CliCommand {
    return newTknCommand('version');
  }
  static showPipelineRunFollowLogs(name: string): CliCommand {
    return newTknCommand('pipelinerun', 'logs', name, '-f');
  }
  static showTaskRunFollowLogs(name: string): CliCommand {
    return newTknCommand('taskrun', 'logs', name, '-f');
  }
  static createPipelineResource(yamlFile: string): CliCommand {
    return newTknCommand('resource', 'create', '-f', yamlFile);
  }
  static tknStatus(): CliCommand {
    return newK8sCommand('auth', 'can-i', 'create', 'pipeline.tekton.dev', '&&', 'kubectl', 'get', 'pipeline.tekton.dev');
  }
  static updateYaml(fsPath: string): CliCommand {
    return newTknCommand('apply', '-f', fsPath);
  }
  static listConditions(): CliCommand {
    return newK8sCommand('get', 'conditions', '-o', 'json');
  }
}

export class TektonNodeImpl implements TektonNode {
  private readonly CONTEXT_DATA = {
    pipelinenode: {
      icon: 'PL.svg',
      tooltip: 'Pipelines: {label}',
      getChildren: () => this.tkn.getPipelines(this)
    },
    pipelineresourcenode: {
      icon: 'PLR.svg',
      tooltip: 'PipelineResources: {label}',
      getChildren: () => this.tkn.getPipelineResources(this)
    },
    pipelineresource: {
      icon: 'PLR.svg',
      tooltip: 'PipelineResources: {label}',
      getChildren: () => []
    },
    tasknode: {
      icon: 'T.svg',
      tooltip: 'Tasks: {label}',
      getChildren: () => this.tkn.getTasks(this)
    },
    clustertasknode: {
      icon: 'CT.svg',
      tooltip: 'ClusterTasks: {label}',
      getChildren: () => this.tkn.getClusterTasks(this)
    },
    pipeline: {
      icon: 'PL.svg',
      tooltip: 'Pipeline: {label}',
      getChildren: () => this.tkn.getPipelineRuns(this)
    },
    pipelinerun: {
      icon: 'running.gif',
      tooltip: 'PipelineRun: {label}',
      getChildren: () => this.tkn.getTaskRuns(this)
    },
    task: {
      icon: 'T.svg',
      tooltip: 'Task: {label}',
      getChildren: () => this.tkn.getTaskRunsforTasks(this)
    },
    taskrun: {
      icon: 'running.gif',
      tooltip: 'TaskRun: {label}',
      getChildren: () => []
    },
    clustertask: {
      icon: 'CT.svg',
      tooltip: 'Clustertask: {label}',
      getChildren: () => this.tkn.getTaskRunsforTasks(this)
    },
    tknDown: {
      icon: 'tkn-down.png',
      tooltip: 'Cannot connect to the tekton',
      getChildren: () => []
    },
    triggertemplates: {
      icon: 'TT.svg',
      tooltip: 'TriggerTemplates: {label}',
      getChildren: () => this.tkn.getTriggerTemplates(this)
    },
    triggerbinding: {
      icon: 'TB.svg',
      tooltip: 'TriggerBinding: {label}',
      getChildren: () => this.tkn.getTriggerBinding(this)
    },
    eventlistener: {
      icon: 'EL.svg',
      tooltip: 'EventListener: {label}',
      getChildren: () => this.tkn.getEventListener(this)
    },
    conditions: {
      icon: 'C.svg',
      tooltip: 'Conditions: {label}',
      getChildren: () => this.tkn.getConditions(this)
    },
  };

  constructor(private parent: TektonNode,
    public readonly name: string,
    public readonly contextValue: ContextType,
    private readonly tkn: Tkn,
    public readonly collapsibleState: TreeItemCollapsibleState = TreeItemCollapsibleState.Collapsed,
    public readonly creationTime?: string,
    public readonly state?: string) {

  }

  get iconPath(): Uri {
    if (this.state) {
      let fileName = 'running.gif';
      if (this.state) {
        switch (this.state) {
          case 'False': {
            fileName = 'failed.png';
            break;
          }
          case 'True': {
            fileName = 'success.png';
            break;
          }
          default: {
            break;
          }
        }
      }
      return Uri.file(path.join(__dirname, '../../images', fileName));
    }
    return Uri.file(path.join(__dirname, '../../images', this.CONTEXT_DATA[this.contextValue].icon));
  }

  get tooltip(): string {
    return format(this.CONTEXT_DATA[this.contextValue].tooltip, this);
  }

  get command(): vsCommand | undefined {
    const arrName = ['Pipelines', 'Tasks', 'ClusterTasks', 'PipelineResources', 'TriggerTemplates', 'TriggerBinding', 'EventListener', 'Conditions'];
    if (arrName.includes(this.name)) {
      return undefined;
    } else {
      return { command: 'tekton.openInEditor', title: 'Open In Editor', arguments: [this] };
    }
  }

  get label(): string {
    return this.name;
  }

  getName(): string {
    return this.name;
  }

  getChildren(): ProviderResult<TektonNode[]> {
    return this.CONTEXT_DATA[this.contextValue].getChildren();
  }

  getParent(): TektonNode {
    return this.parent;
  }

}

type PipelineTaskRunData = {
  metadata: {
    creationTimestamp: string;
    name: string;
    labels: {
      'tekton.dev/pipelineTask': string;
      'tekton.dev/pipelineRun': string;
    };
  };
  status: {
    completionTime: string;
    conditions: [{
      status: string;
    }];
  };
  spec: {
    taskRef: {
      name: string;
    };
  };
};


export class TaskRun extends TektonNodeImpl {
  private started: string;
  private finished: string;
  private shortName: string;
  constructor(parent: TektonNode,
    name: string,
    tkn: Tkn,
    item: PipelineTaskRunData) {
    super(parent, name, ContextType.TASKRUN, tkn, TreeItemCollapsibleState.None, item.metadata.creationTimestamp, item.status ? item.status.conditions[0].status : '');
    // destructuring assignment to save only required data from 
    ({
      metadata: {
        creationTimestamp: this.started,
        labels: {
          'tekton.dev/pipelineTask': this.shortName
        }
      }, status: {
        completionTime: this.finished
      }
    } = item);

  }

  get label(): string {
    return this.shortName;
  }

  get description(): string {
    let r = '';
    if (this.getParent().contextValue === ContextType.TASK) {
      if (this.finished) {
        r = 'started ' + humanizer(Date.now() - Date.parse(this.started)) + ' ago, finished in ' + humanizer(Date.parse(this.finished) - Date.parse(this.started));
      } else {
        r = 'started ' + humanizer(Date.now() - Date.parse(this.started)) + ' ago, running for ' + humanizer(Date.now() - Date.parse(this.started));
      }
    } else {
      if (this.finished) {
        r = 'finished in ' + humanizer(Date.parse(this.finished) - Date.parse(this.started));
      } else {
        r = 'running for ' + humanizer(Date.now() - Date.parse(this.started));
      }
    }
    return r;
  }
}


export class PipelineRun extends TektonNodeImpl {
  private started: string;
  private finished: string;
  private generateName: string;
  constructor(parent: TektonNode,
    name: string,
    tkn: Tkn,
    item: PipelineRunData) {
    super(parent, name, ContextType.PIPELINERUN, tkn, TreeItemCollapsibleState.Expanded, item.metadata.creationTimestamp, item.status ? item.status.conditions[0].status : '');
    // destructuring assignment to save only required data from
    ({
      metadata: {
        creationTimestamp: this.started,
        generateName: this.generateName
      }, status: {
        completionTime: this.finished
      }
    } = item);
  }

  get label(): string {
    return this.name;
  }

  get description(): string {
    let r = '';
    if (this.finished) {
      r = 'started ' + humanizer(Date.now() - Date.parse(this.started)) + ' ago, finished in ' + humanizer(Date.parse(this.finished) - Date.parse(this.started));
    } else {
      r = 'running for ' + humanizer(Date.now() - Date.parse(this.started));
    }
    return r;
  }
}

export class MoreNode extends TreeItem implements TektonNode {
  contextValue: string;
  creationTime?: string;
  state?: string;
  detail?: string;
  picked?: boolean;
  alwaysShow?: boolean;
  label: string;

  constructor(private showNext: number,
    private totalCount: number,
    private parent: TektonNode) {
    super('more', TreeItemCollapsibleState.None);
    this.command = { command: '_tekton.explorer.more', title: `more ${this.showNext}`, arguments: [this.showNext, this.parent] };
  }

  get tooltip(): string {
    return `${this.showNext} more from ${this.totalCount}`
  }

  get description(): string {
    return `${this.showNext} from ${this.totalCount}`
  }

  getChildren(): ProviderResult<TektonNode[]> {
    throw new Error('Method not implemented.');
  }
  getParent(): TektonNode {
    return this.parent;
  }
  getName(): string {
    return this.label;
  }

}

export interface Tkn {
  getPipelineNodes(): Promise<TektonNode[]>;
  startPipeline(pipeline: StartPipelineObject): Promise<TektonNode[]>;
  restartPipeline(pipeline: TektonNode): Promise<void>;
  getPipelines(pipeline: TektonNode): Promise<TektonNode[]>;
  getPipelineRuns(pipelineRun: TektonNode): Promise<TektonNode[]>;
  getPipelineResources(pipelineResources: TektonNode): Promise<TektonNode[]>;
  getTasks(task: TektonNode): Promise<TektonNode[]>;
  getRawTasks(): Promise<TknTask[]>;
  getTaskRuns(taskRun: TektonNode): Promise<TektonNode[]>;
  getClusterTasks(clustertask: TektonNode): Promise<TektonNode[]>;
  getRawClusterTasks(): Promise<TknTask[]>;
  execute(command: CliCommand, cwd?: string, fail?: boolean): Promise<CliExitData>;
  executeInTerminal(command: CliCommand, cwd?: string): void;
  getTaskRunsforTasks(task: TektonNode): Promise<TektonNode[]>;
  getTriggerTemplates(triggerTemplates: TektonNode): Promise<TektonNode[]>;
  getTriggerBinding(triggerBinding: TektonNode): Promise<TektonNode[]>;
  getEventListener(EventListener: TektonNode): Promise<TektonNode[]>;
  getConditions(conditions: TektonNode): Promise<TektonNode[]>;
  clearCache?(): void;
}

export function getInstance(): Tkn {
  return TknImpl.Instance;
}

function compareNodes(a, b): number {
  if (!a.contextValue) { return -1; }
  if (!b.contextValue) { return 1; }
  const t = a.contextValue.localeCompare(b.contextValue);
  return t ? t : a.label.localeCompare(b.label);
}

function compareTimeNewestFirst(a: TektonNode, b: TektonNode): number {
  const aTime = Date.parse(a.creationTime);
  const bTime = Date.parse(b.creationTime);
  return aTime < bTime ? 1 : -1;
}

function getStderrString(data: string | Error): string {
  if (data instanceof Error) {
    return data.message;
  } else if ((typeof data === 'string')) {
    return data;
  }
}

export class TknImpl implements Tkn {

  public static ROOT: TektonNode = new TektonNodeImpl(undefined, 'root', undefined, undefined);
  private cache: Map<TektonNode, TektonNode[]> = new Map();
  private static cli: Cli = CliImpl.getInstance();
  private static instance: Tkn;
  // Get page size from configuration, in case configuration is not present(dev mode) use hard coded value
  defaultPageSize: number = workspace.getConfiguration('vs-tekton').has('treePaginationLimit') ? workspace.getConfiguration('vs-tekton').get('treePaginationLimit') : 5;

  public static get Instance(): Tkn {
    if (!TknImpl.instance) {
      TknImpl.instance = new TknImpl();
    }
    return TknImpl.instance;
  }

  async getPipelineNodes(): Promise<TektonNode[]> {
    const result: CliExitData = await this.execute(
      Command.tknStatus(), process.cwd(), false
    );
    if (result.stdout.trim() === 'no') {
      const tknDownMsg = 'The current user doesn\'t have the privileges to interact with tekton resources.';
      return [new TektonNodeImpl(null, tknDownMsg, ContextType.TKN_DOWN, TknImpl.instance, TreeItemCollapsibleState.None)];
    }
    if (result.error && getStderrString(result.error).indexOf('the server doesn\'t have a resource type "pipeline"') > -1) {
      const tknDownMsg = 'Please install the OpenShift Pipelines Operator.';
      return [new TektonNodeImpl(null, tknDownMsg, ContextType.TKN_DOWN, TknImpl.instance, TreeItemCollapsibleState.None)];
    }
    if (!this.cache.has(TknImpl.ROOT)) {
      this.cache.set(TknImpl.ROOT, await this._getPipelineNodes());
    }
    return this.cache.get(TknImpl.ROOT);
  }

  public async _getPipelineNodes(): Promise<TektonNode[]> {
    const pipelineTree: TektonNode[] = [];
    const pipelineNode = new TektonNodeImpl(TknImpl.ROOT, 'Pipelines', ContextType.PIPELINENODE, this, TreeItemCollapsibleState.Collapsed);
    const taskNode = new TektonNodeImpl(TknImpl.ROOT, 'Tasks', ContextType.TASKNODE, this, TreeItemCollapsibleState.Collapsed);
    const clustertaskNode = new TektonNodeImpl(TknImpl.ROOT, 'ClusterTasks', ContextType.CLUSTERTASKNODE, this, TreeItemCollapsibleState.Collapsed);
    const pipelineResourceNode = new TektonNodeImpl(TknImpl.ROOT, 'PipelineResources', ContextType.PIPELINERESOURCENODE, this, TreeItemCollapsibleState.Collapsed);
    const triggerTemplatesNode = new TektonNodeImpl(TknImpl.ROOT, 'TriggerTemplates', ContextType.TRIGGERTEMPLATES, this, TreeItemCollapsibleState.Collapsed);
    const triggerBindingNode = new TektonNodeImpl(TknImpl.ROOT, 'TriggerBinding', ContextType.TRIGGERBINDING, this, TreeItemCollapsibleState.Collapsed);
    const eventListenerNode = new TektonNodeImpl(TknImpl.ROOT, 'EventListener', ContextType.EVENTLISTENER, this, TreeItemCollapsibleState.Collapsed);
    const conditionsNode = new TektonNodeImpl(TknImpl.ROOT, 'Conditions', ContextType.CONDITIONS, this, TreeItemCollapsibleState.Collapsed);
    pipelineTree.push(pipelineNode, taskNode, clustertaskNode, pipelineResourceNode, triggerTemplatesNode, triggerBindingNode, eventListenerNode, conditionsNode);
    this.cache.set(pipelineNode, await this.getPipelines(pipelineNode));
    this.cache.set(taskNode, await this.getTasks(taskNode));
    this.cache.set(clustertaskNode, await this.getClusterTasks(clustertaskNode));
    this.cache.set(pipelineResourceNode, await this.getPipelineResources(pipelineResourceNode));
    this.cache.set(triggerTemplatesNode, await this.getTriggerTemplates(triggerTemplatesNode));
    this.cache.set(triggerBindingNode, await this.getTriggerBinding(eventListenerNode));
    this.cache.set(eventListenerNode, await this.getEventListener(eventListenerNode));
    this.cache.set(conditionsNode, await this.getConditions(conditionsNode));
    return pipelineTree;

  }

  async refreshPipelineRun(pipelineName: string, PipelineRun: TektonNode): Promise<void> {
    const status: TektonNode = PipelineRun;
    await kubectl.watchPipelineRun(pipelineName);
    pipelineExplorer.refresh(status? status.getParent().getParent(): undefined);
  }

  async getPipelineStatus(listOfPipelineRuns: TektonNode[]): Promise<void> {
    for (const pipelineRun of listOfPipelineRuns) {
      if (pipelineRun.state === 'Unknown') {
        this.refreshPipelineRun(pipelineRun.getName(), pipelineRun);
      }
    }
  }

  async getPipelineRuns(pipeline: TektonNode): Promise<TektonNode[]> {
    if (!pipeline.visibleChildren) {
      pipeline.visibleChildren = this.defaultPageSize;
    }
    let pipelineRuns: TektonNode[] = this.cache.get(pipeline);
    if (!pipelineRuns) {
      pipelineRuns = await this._getPipelineRuns(pipeline);
      this.cache.set(pipeline, pipelineRuns);
    }
    this.getPipelineStatus(pipelineRuns);
    const currentRuns = pipelineRuns.slice(0, Math.min(pipeline.visibleChildren, pipelineRuns.length))
    if (pipeline.visibleChildren < pipelineRuns.length) {
      let nextPage = this.defaultPageSize;
      if (pipeline.visibleChildren + this.defaultPageSize > pipelineRuns.length) {
        nextPage = pipelineRuns.length - pipeline.visibleChildren;
      }
      currentRuns.push(new MoreNode(nextPage, pipelineRuns.length, pipeline));
    }
    return currentRuns;
  }

  async _getPipelineRuns(pipeline: TektonNode): Promise<TektonNode[]> | undefined {
    const result = await this.execute(Command.listPipelineRuns(pipeline.getName()));
    if (result.error) {
      console.log(result + ' Std.err when processing pipelines');
      return [new TektonNodeImpl(pipeline, getStderrString(result.error), ContextType.PIPELINERUN, this, TreeItemCollapsibleState.None)];
    }

    let data: PipelineRunData[] = [];
    try {
      const r = JSON.parse(result.stdout);
      data = r.items ? r.items : data;
      // eslint-disable-next-line no-empty
    } catch (ignore) {
    }

    return data
      .filter((value) => value.spec.pipelineRef.name === pipeline.getName())
      .map((value) => new PipelineRun(pipeline, value.metadata.name, this, value))
      .sort(compareTimeNewestFirst);
  }

  public async getTaskRunsforTasks(task: TektonNode): Promise<TektonNode[]> {
    let taskruns: TektonNode[] = this.cache.get(task);
    if (!taskruns) {
      taskruns = await this._getTaskRunsforTasks(task);
      this.cache.set(task, taskruns);
    }
    return taskruns;
  }

  async _getTaskRunsforTasks(task: TektonNode): Promise<TektonNode[]> {
    const result = await this.execute(Command.listTaskRunsforTasks(task.getName()));
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
      .filter((value) => value.spec.taskRef.name === task.getName())
      .map((value) => new TaskRun(task, value.metadata.name, this, value))
      .sort(compareTimeNewestFirst);
  }

  async getTaskRuns(pipelineRun: TektonNode): Promise<TektonNode[]> {
    if (!pipelineRun.visibleChildren) {
      pipelineRun.visibleChildren = this.defaultPageSize;
    }

    let taskRuns: TektonNode[] = this.cache.get(pipelineRun);
    if (!taskRuns) {
      taskRuns = await this._getTaskRuns(pipelineRun);
      this.cache.set(pipelineRun, taskRuns);
    }
    const currentRuns = taskRuns.slice(0, Math.min(pipelineRun.visibleChildren, taskRuns.length))
    if (pipelineRun.visibleChildren < taskRuns.length) {
      let nextPage = this.defaultPageSize;
      if (pipelineRun.visibleChildren + this.defaultPageSize > taskRuns.length) {
        nextPage = taskRuns.length - pipelineRun.visibleChildren;
      }
      currentRuns.push(new MoreNode(nextPage, taskRuns.length, pipelineRun));
    }
    return currentRuns;
  }

  async _getTaskRuns(pipelinerun: TektonNode): Promise<TektonNode[]> {
    const result = await this.execute(Command.listTaskRuns());
    if (result.error) {
      console.log(result + ' Std.err when processing pipelines');
      return [new TektonNodeImpl(pipelinerun, getStderrString(result.error), ContextType.TASKRUN, this, TreeItemCollapsibleState.Expanded)];
    }
    let data: PipelineTaskRunData[] = [];
    try {
      data = JSON.parse(result.stdout).items;
      // eslint-disable-next-line no-empty
    } catch (ignore) {
    }

    return data
      .filter((value) => value.metadata.labels['tekton.dev/pipelineRun'] === pipelinerun.getName())
      .map((value) => new TaskRun(pipelinerun, value.metadata.name, this, value))
      .sort(compareTimeNewestFirst);
  }

  async getPipelines(pipeline: TektonNode): Promise<TektonNode[]> {
    return (await this._getPipelines(pipeline));
  }

  async _getPipelines(pipeline: TektonNode): Promise<TektonNode[]> {
    let data: TknTask[] = [];
    const result = await this.execute(Command.listPipelines(), process.cwd(), false);
    if (result.error) {
      console.log(result + ' Std.err when processing pipelines');
      return [new TektonNodeImpl(pipeline, getStderrString(result.error), ContextType.PIPELINE, this, TreeItemCollapsibleState.Expanded)];
    }
    try {
      data = JSON.parse(result.stdout).items;
    } catch (ignore) {
      //show no pipelines if output is not correct json
    }
    let pipelines: string[] = data.map((value) => value.metadata.name);
    pipelines = [...new Set(pipelines)];
    const treeState = pipelines.length > 0 ? TreeItemCollapsibleState.Expanded : TreeItemCollapsibleState.Collapsed;
    return pipelines.map<TektonNode>((value) => new TektonNodeImpl(pipeline, value, ContextType.PIPELINE, this, treeState)).sort(compareNodes);
  }

  async getPipelineResources(pipelineResources: TektonNode): Promise<TektonNode[]> {
    return (await this._getPipelineResources(pipelineResources));
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
    const pipelineresources: string[] = data.map((value) => value.metadata.name);
    return pipelineresources.map<TektonNode>((value) => new TektonNodeImpl(pipelineResource, value, ContextType.PIPELINERESOURCE, this, TreeItemCollapsibleState.None)).sort(compareNodes);
  }

  async getConditions(conditionsNode: TektonNode): Promise<TektonNode[]> {
    return (await this._getConditions(conditionsNode, Command.listConditions(), ContextType.CONDITIONS));
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
    let condition: string[] = data.map((value) => value.metadata.name);
    condition = [...new Set(condition)];
    return condition.map<TektonNode>((value) => new TektonNodeImpl(conditionResource, value, conditionContextType, this, TreeItemCollapsibleState.None)).sort(compareNodes);
  }

  async getTriggerTemplates(triggerTemplatesNode: TektonNode): Promise<TektonNode[]> {
    return (await this._getTriggerResource(triggerTemplatesNode, Command.listTriggerTemplates(), ContextType.TRIGGERTEMPLATES));
  }

  async getTriggerBinding(triggerBindingNode: TektonNode): Promise<TektonNode[]> {
    return (await this._getTriggerResource(triggerBindingNode, Command.listTriggerBinding(), ContextType.TRIGGERBINDING));
  }

  async getEventListener(eventListenerNode: TektonNode): Promise<TektonNode[]> {
    return (await this._getTriggerResource(eventListenerNode, Command.listEventListener(), ContextType.EVENTLISTENER));
  }

  private async _getTriggerResource(trigerResource: TektonNode, command: CliCommand, triggerContextType: ContextType): Promise<TektonNode[]> {
    let data: TknPipelineResource[] = [];
    const result = await this.execute(command, process.cwd(), false);
    if (result.error) {
      return [new TektonNodeImpl(trigerResource, getStderrString(result.error), triggerContextType, this, TreeItemCollapsibleState.Expanded)];
    }
    try {
      data = JSON.parse(result.stdout).items;
    } catch (ignore) {
      //show no pipelines if output is not correct json
    }
    let trigger: string[] = data.map((value) => value.metadata.name);
    trigger = [...new Set(trigger)];
    return trigger.map<TektonNode>((value) => new TektonNodeImpl(trigerResource, value, triggerContextType, this, TreeItemCollapsibleState.None)).sort(compareNodes);
  }

  public async getTasks(task: TektonNode): Promise<TektonNode[]> {
    return (await this._getTasks(task));
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
    let tasks: string[] = data.map((value) => value.metadata.name);
    tasks = [...new Set(tasks)];
    return tasks.map<TektonNode>((value) => new TektonNodeImpl(task, value, ContextType.TASK, this, TreeItemCollapsibleState.Collapsed)).sort(compareNodes);
  }

  async getRawTasks(): Promise<TknTask[]> {
    let data: TknTask[] = [];
    const result = await this.execute(Command.listTasks());
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

  async getClusterTasks(clustertask: TektonNode): Promise<TektonNode[]> {
    return (await this._getClusterTasks(clustertask));
  }

  async _getClusterTasks(clustertask: TektonNode): Promise<TektonNode[]> {
    let data: TknTask[] = [];
    try {
      const result = await this.execute(Command.listClusterTasks());
      data = JSON.parse(result.stdout).items;
      // eslint-disable-next-line no-empty
    } catch (ignore) {

    }
    let tasks: string[] = data.map((value) => value.metadata.name);
    tasks = [...new Set(tasks)];
    return tasks.map<TektonNode>((value) => new TektonNodeImpl(clustertask, value, ContextType.CLUSTERTASK, this, TreeItemCollapsibleState.Collapsed)).sort(compareNodes);
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

  async startPipeline(pipeline: StartPipelineObject): Promise<TektonNode[]> {
    const result = await this.execute(Command.startPipeline(pipeline));
    let data: TknTask[] = [];
    try {
      data = JSON.parse(result.stdout).items;
      // eslint-disable-next-line no-empty
    } catch (ignore) {

    }
    let pipelines: string[] = data.map((value) => value.metadata.name);
    pipelines = [...new Set(pipelines)];
    const treeState = pipelines.length > 0 ? TreeItemCollapsibleState.Expanded : TreeItemCollapsibleState.Collapsed;
    return pipelines.map<TektonNode>((value) => new TektonNodeImpl(undefined, value, ContextType.PIPELINE, this, treeState)).sort(compareNodes);
  }

  async restartPipeline(pipeline: TektonNode): Promise<void> {
    await this.executeInTerminal(Command.restartPipeline(pipeline.getName()));
  }

  public async executeInTerminal(command: CliCommand, cwd: string = process.cwd(), name = 'Tekton'): Promise<void> {
    let toolLocation = await ToolsConfig.detectOrDownload();
    if (toolLocation) {
      toolLocation = path.dirname(toolLocation);
    }
    const terminal: Terminal = WindowUtil.createTerminal(name, cwd, toolLocation);
    terminal.sendText(cliCommandToString(command), true);
    terminal.show();
  }

  public async execute(command: CliCommand, cwd?: string, fail = true): Promise<CliExitData> {
    const toolLocation = await ToolsConfig.detectOrDownload();
    if (toolLocation) {
      command.cliCommand = command.cliCommand.replace('tkn', `"${toolLocation}"`).replace(new RegExp('&& tkn', 'g'), `&& "${toolLocation}"`);
    }


    return TknImpl.cli.execute(command, cwd ? { cwd } : {})
      .then(async (result) => result.error && fail ? Promise.reject(result.error) : result)
      .catch((err) => fail ? Promise.reject(err) : Promise.resolve({ error: null, stdout: '', stderr: '' }));
  }

  clearCache(): void {
    this.cache.clear();
  }
}

export const tknInstance = new TknImpl();
