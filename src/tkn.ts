/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { CliCommand, CliExitData, cli, createCliCommand, cliCommandToString } from './cli';
import { ProviderResult, TreeItemCollapsibleState, Terminal, Uri, workspace, TreeItem, QuickPickItem } from 'vscode';
import { WindowUtil } from './util/windowUtils';
import * as path from 'path';
import { ToolsConfig } from './tools';
import format = require('string-format');
import humanize = require('humanize-duration');
import { TknPipelineResource, TknTask, PipelineRunData, TaskRun as RawTaskRun, PipelineRunConditionCheckStatus, TaskRunStatus, ConditionCheckStatus } from './tekton';
import { kubectl } from './kubectl';
import { pipelineExplorer } from './pipeline/pipelineExplorer';
import { StartObject } from './tekton/pipelinecontent';
import { RunState } from './yaml-support/tkn-yaml';
import { version } from './util/tknversion';
import { pipelineTriggerStatus, watchResources } from './util/watchResources';

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


export interface TektonNode extends QuickPickItem {
  getChildren(): ProviderResult<TektonNode[]>;
  getParent(): TektonNode | undefined;
  getName(): string;
  refresh(): Promise<void>;
  contextValue?: string;
  creationTime?: string;
  state?: string;
  visibleChildren?: number;
  collapsibleState?: TreeItemCollapsibleState;
  uid?: string;
}

interface NameId {
  name: string;
  uid: string;
}

export enum ContextType {
  TASK = 'task',
  TASKRUN = 'taskrun',
  PIPELINE = 'pipeline',
  PIPELINERUN = 'pipelinerun',
  CLUSTERTASK = 'clustertask',
  TASKRUNNODE = 'taskrunnode',
  PIPELINENODE = 'pipelinenode',
  PIPELINERESOURCENODE = 'pipelineresourcenode',
  PIPELINERESOURCE = 'pipelineresource',
  TASKNODE = 'tasknode',
  CLUSTERTASKNODE = 'clustertasknode',
  TKN_DOWN = 'tknDown',
  TRIGGERTEMPLATESNODE = 'triggertemplatesnode',
  TRIGGERTEMPLATES = 'triggertemplates',
  TRIGGERBINDINGNODE = 'triggerbindingnode',
  TRIGGERBINDING = 'triggerbinding',
  CLUSTERTRIGGERBINDINGNODE = 'clustertriggerbindingnode',
  CLUSTERTRIGGERBINDING = 'clustertriggerbinding',
  EVENTLISTENERNODE = 'eventlistenernode',
  EVENTLISTENER = 'eventlistener',
  CONDITIONSNODE = 'conditionsnode',
  CONDITIONS = 'conditions',
  PIPELINERUNNODE = 'pipelinerunnode',
  CONDITIONTASKRUN = 'tr',
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

function tknWorkspace(pipelineData: StartObject): string[] {
  const workspace: string[] = [];
  pipelineData.workspaces.forEach(element => {
    if (element.workspaceType === 'PersistentVolumeClaim') {
      if (element.item && element.item.length === 0) {
        workspace.push(`-w name=${element.name},claimName=${element.workspaceName}`);
      } else {
        workspace.push(`-w name=${element.name},claimName=${element.workspaceName},subPath=${element.subPath}`);
      }
    } else if (element.workspaceType === 'ConfigMap') {
      if (element.item && element.item.length !== 0) {
        let configMap = `-w name=${element.name},config=${element.workspaceName}`;
        element.item.forEach(value => {
          configMap = configMap.concat(`,item=${value.key}=${value.path}`);
        });
        workspace.push(configMap);
      } else {
        workspace.push(`-w name=${element.name},config=${element.workspaceName},item=${element.key}=${element.value}`);
      }
    } else if (element.workspaceType === 'Secret') {
      if (element.item && element.item.length !== 0) {
        let secret = `-w name=${element.name},secret=${element.workspaceName}`;
        element.item.forEach(value => {
          secret = secret.concat(`,item=${value.key}=${value.path}`);
        });
        workspace.push(secret);
      } else {
        workspace.push(`-w name=${element.name},secret=${element.workspaceName}`);
      }
    } else if (element.workspaceType === 'EmptyDir') {
      workspace.push(`-w name=${element.name},emptyDir=${element.emptyDir}`);
    }
  });
  return workspace;
}

function newTknCommand(...tknArguments: string[]): CliCommand {
  return createCliCommand('tkn', ...tknArguments);
}

export function newK8sCommand(...k8sArguments): CliCommand {
  return createCliCommand('kubectl', ...k8sArguments);
}

export class Command {
  @verbose
  static listTaskRunsForTasks(task: string): CliCommand {
    return newK8sCommand('get', 'taskrun', '-l', `tekton.dev/task=${task}`, '-o', 'json');
  }

  static getTaskRun(taskRunName: string): CliCommand {
    return newK8sCommand('get', 'taskrun', taskRunName, '-o', 'json');
  }

  @verbose
  static listTaskRunsForTasksInTerminal(task: string): CliCommand {
    return newTknCommand('taskrun', 'list', task);
  }

  @verbose
  static startPipeline(pipelineData: StartObject): CliCommand {
    const resources: string[] = [];
    if (!pipelineData.workspaces && !pipelineData.resources && !pipelineData.params) {
      return newTknCommand('pipeline', 'start', pipelineData.name);
    }
    const svcAcct: string[] = pipelineData.serviceAccount ? ['-s ', pipelineData.serviceAccount] : [];
    pipelineData.resources.forEach(element => {
      resources.push('--resource');
      resources.push(element.name + '=' + element.resourceRef);
    });

    if (pipelineData.params.length === 0) {
      if (pipelineData.workspaces.length === 0) {
        return newTknCommand('pipeline', 'start', pipelineData.name, ...resources, ...svcAcct);
      } else {
        const workspace = tknWorkspace(pipelineData);
        return newTknCommand('pipeline', 'start', pipelineData.name, ...resources, ...workspace, ...svcAcct);
      }
    } else {
      const params: string[] = [];
      pipelineData.params.forEach(element => {
        params.push('--param');
        params.push(element.name + '=' + element.default);
      });
      if (pipelineData.workspaces.length === 0) {
        return newTknCommand('pipeline', 'start', pipelineData.name, ...resources, ...params, ...svcAcct);
      } else {
        const workspace = tknWorkspace(pipelineData);
        return newTknCommand('pipeline', 'start', pipelineData.name, ...resources, ...params, ...workspace, ...svcAcct);
      }
    }
  }
  @verbose
  static startTask(taskData: StartObject): CliCommand {
    const resources: string[] = [];
    const svcAcct: string[] = taskData.serviceAccount ? ['-s ', taskData.serviceAccount] : [];
    taskData.resources.forEach(element => {
      if (element.resourceType === 'inputs') {
        resources.push('-i');
        resources.push(element.name + '=' + element.resourceRef);
      } else if (element.resourceType === 'outputs') {
        resources.push('-o');
        resources.push(element.name + '=' + element.resourceRef);
      }
    });

    if (taskData.params.length === 0) {
      return newTknCommand('task', 'start', taskData.name, ...resources, ...svcAcct);
    }
    else {
      const params: string[] = [];
      taskData.params.forEach(element => {
        params.push('--param');
        params.push(element.name + '=' + element.default);
      });
      return newTknCommand('task', 'start', taskData.name, ...resources, ...params, ...svcAcct);
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
    return newK8sCommand('get', 'pipelineresources', '-o', 'json');
  }
  @verbose
  static listTriggerTemplates(): CliCommand {
    return newK8sCommand('get', 'triggertemplates', '-o', 'json');
  }
  @verbose
  static listTriggerBinding(): CliCommand {
    return newK8sCommand('get', 'triggerbinding', '-o', 'json');
  }
  static listClusterTriggerBinding(): CliCommand {
    return newK8sCommand('get', 'clustertriggerbinding', '-o', 'json');
  }

  static deleteClusterTriggerBinding(name: string): CliCommand {
    return newTknCommand('clustertriggerbinding', 'delete', name, '-f');
  }
  @verbose
  static listEventListener(): CliCommand {
    return newK8sCommand('get', 'eventlistener', '-o', 'json');
  }
  static deleteTriggerTemplate(name: string): CliCommand {
    return newTknCommand('triggertemplate', 'delete', name, '-f');
  }
  static deleteTriggerBinding(name: string): CliCommand {
    return newTknCommand('triggerbinding', 'delete', name, '-f');
  }
  static deleteCondition(name: string): CliCommand {
    return newTknCommand('condition', 'delete', name, '-f');
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
    return newK8sCommand('get', 'pipeline', '-o', 'json');
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
    return newK8sCommand('get', 'pipelinerun', '-l', `tekton.dev/pipeline=${name}`, '-o', 'json');
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
  static showDiagnosticData(name: string): CliCommand {
    return newK8sCommand('get', 'pods', name, '-o', 'jsonpath=\'{range .status.conditions[?(.reason)]}{"reason: "}{.reason}{"\\n"}{"message: "}{.message}{"\\n"}{end}\'');
  }
  static getPipelineRunAndTaskRunData(resource: string, name: string): CliCommand {
    return newK8sCommand('get', resource, name, '-o', 'json');
  }
  @verbose
  static listTasks(namespace?: string): CliCommand {
    return newK8sCommand('get', 'task', ...(namespace ? ['-n', namespace] : ''), '-o', 'json');
  }
  @verbose
  static listTasksInTerminal(namespace?: string): CliCommand {
    return newTknCommand('task', 'list', ...(namespace ? ['-n', namespace] : ''), '-o', 'json');
  }

  static listTaskRunsForPipelineRun(pipelineRunName: string): CliCommand {
    return newK8sCommand('get', 'taskrun', '-l', `tekton.dev/pipelineRun=${pipelineRunName}`, '-o', 'json');
  }

  static listTaskRunsForPipelineRunInTerminal(pipelineRunName: string): CliCommand {
    return newK8sCommand('get', 'taskrun', '-l', `tekton.dev/pipelineRun=${pipelineRunName}`);
  }

  @verbose
  static deleteTask(name: string): CliCommand {
    return newTknCommand('task', 'delete', name, '-f');
  }
  @verbose
  static listClusterTasks(namespace?: string): CliCommand {
    return newK8sCommand('get', 'clustertask', ...(namespace ? ['-n', namespace] : ''), '-o', 'json');
  }
  static listClusterTasksInTerminal(namespace?: string): CliCommand {
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
  static checkTekton(): CliCommand {
    return newK8sCommand('auth', 'can-i', 'create', 'pipeline.tekton.dev', '&&', 'kubectl', 'get', 'pipeline.tekton.dev');
  }
  static updateYaml(fsPath: string): CliCommand {
    return newTknCommand('apply', '-f', fsPath);
  }
  static listTaskRun(): CliCommand {
    return newK8sCommand('get', 'taskrun', '-o', 'json');
  }
  static listConditions(): CliCommand {
    return newK8sCommand('get', 'conditions', '-o', 'json');
  }
  static listPipelineRun(): CliCommand {
    return newK8sCommand('get', 'pipelinerun', '-o', 'json');
  }
  static watchResources(resourceName: string, name: string): CliCommand {
    return newK8sCommand('get', resourceName, name, '-w', '-o', 'json');
  }
  static workspace(name: string): CliCommand {
    return newK8sCommand('get', name, '-o', 'json');
  }
  static getPipelineResource(): CliCommand {
    return newK8sCommand('get', 'pipelineresources', '-o', 'json');
  }

  static getPipelineRun(name: string): CliCommand {
    return newK8sCommand('get', 'pipelinerun', name, '-o', 'json');
  }

  static getPipeline(name: string): CliCommand {
    return newK8sCommand('get', 'pipeline', name, '-o', 'json');
  }

  static getEventListener(name: string): CliCommand {
    return newK8sCommand('get', 'el', name, '-o', 'json');
  }

  static getService(name: string): CliCommand {
    return newK8sCommand('get', 'Service', name, '-o', 'json');
  }

  static create(file: string): CliCommand {
    return newK8sCommand('create', '--save-config', '-f', file);
  }

  static apply(file: string): CliCommand {
    return newK8sCommand('apply', '-f', file);
  }

  static getRoute(name: string): CliCommand {
    return newK8sCommand('get', 'route', name, '-o', 'json');
  }

  static getTrigger(name: string): CliCommand {
    return newK8sCommand('get', 'trigger', name, '-o', 'json');
  }

}

const IMAGES = '../../images';
const ERROR_PATH = '../../images/generated/error';
const PENDING_PATH = '../../images/generated/pending';

export class TektonNodeImpl implements TektonNode {
  protected readonly CONTEXT_DATA = {
    pipelinenode: {
      icon: 'PL.svg',
      tooltip: 'Pipelines: {label}',
      getChildren: () => this.tkn.getPipelines(this)
    },
    pipelinerunnode: {
      icon: 'PLR.svg',
      tooltip: 'PipelineRuns: {label}',
      getChildren: () => this.tkn.getPipelineRunsList(this)
    },
    pipelineresourcenode: {
      icon: 'PR.svg',
      tooltip: 'PipelineResources: {label}',
      getChildren: () => this.tkn.getPipelineResources(this)
    },
    pipelineresource: {
      icon: 'PR.svg',
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
      icon: 'PLR.svg',
      tooltip: 'PipelineRun: {label}',
      getChildren: () => []
    },
    task: {
      icon: 'T.svg',
      tooltip: 'Task: {label}',
      getChildren: () => this.tkn.getTaskRunsForTasks(this)
    },
    taskrun: {
      icon: 'TR.svg',
      tooltip: 'TaskRun: {label}',
      getChildren: () => []
    },
    clustertask: {
      icon: 'CT.svg',
      tooltip: 'Clustertask: {label}',
      getChildren: () => this.tkn.getTaskRunsForTasks(this)
    },
    tknDown: {
      icon: 'tkn-down.png',
      tooltip: 'Cannot connect to the tekton',
      getChildren: () => []
    },
    triggertemplatesnode: {
      icon: 'TT.svg',
      tooltip: 'TriggerTemplates: {label}',
      getChildren: () => this.tkn.getTriggerTemplates(this)
    },
    triggertemplates: {
      icon: 'TT.svg',
      tooltip: 'TriggerTemplates: {label}',
      getChildren: () => []
    },
    triggerbindingnode: {
      icon: 'TB.svg',
      tooltip: 'TriggerBinding: {label}',
      getChildren: () => this.tkn.getTriggerBinding(this)
    },
    triggerbinding: {
      icon: 'TB.svg',
      tooltip: 'TriggerBinding: {label}',
      getChildren: () => []
    },
    clustertriggerbindingnode: {
      icon: 'CTB.svg',
      tooltip: 'ClusterTriggerBinding: {label}',
      getChildren: () => this.tkn.getClusterTriggerBinding(this)
    },
    clustertriggerbinding: {
      icon: 'CTB.svg',
      tooltip: 'ClusterTriggerBinding: {label}',
      getChildren: () => []
    },
    eventlistenernode: {
      icon: 'EL.svg',
      tooltip: 'EventListener: {label}',
      getChildren: () => this.tkn.getEventListener(this)
    },
    eventlistener: {
      icon: 'EL.svg',
      tooltip: 'EventListener: {label}',
      getChildren: () => []
    },
    conditionsnode: {
      icon: 'C.svg',
      tooltip: 'Conditions: {label}',
      getChildren: () => this.tkn.getConditions(this)
    },
    conditions: {
      icon: 'C.svg',
      tooltip: 'Conditions: {label}',
      getChildren: () => []
    },
    tr: {
      icon: 'C.svg',
      tooltip: 'ConditionRun: {label}',
      getChildren: () => []
    },
    taskrunnode: {
      icon: 'TR.svg',
      tooltip: 'TaskRuns: {label}',
      getChildren: () => this.tkn.getTaskRunList(this)
    },
  };

  constructor(private parent: TektonNode,
    public readonly name: string,
    public readonly contextValue: ContextType,
    protected readonly tkn: Tkn,
    public readonly collapsibleState: TreeItemCollapsibleState = TreeItemCollapsibleState.Collapsed,
    public readonly uid?: string,
    public readonly creationTime?: string,
    public readonly state?: string) {

  }

  get iconPath(): Uri {
    if (this.state) {
      let filePath = IMAGES;
      switch (this.state) {
        case 'False': {
          filePath = ERROR_PATH;
          break;
        }
        case 'True': {
          filePath = IMAGES;
          break;
        }
        default: {
          return Uri.file(path.join(__dirname, IMAGES, 'running.gif'));
        }
      }
      return Uri.file(path.join(__dirname, filePath, this.CONTEXT_DATA[this.contextValue].icon));
    }
    return Uri.file(path.join(__dirname, IMAGES, this.CONTEXT_DATA[this.contextValue].icon));
  }

  get tooltip(): string {
    return format(this.CONTEXT_DATA[this.contextValue].tooltip, this);
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

  refresh(): Promise<void> {
    return Promise.resolve();
  }

}

export type PipelineTaskRunData = {
  metadata?: {
    creationTimestamp: string;
    name: string;
    uid: string;
    labels: {
      'tekton.dev/pipelineTask': string;
      'tekton.dev/pipelineRun': string;
      'tekton.dev/task': string;
      'tekton.dev/conditionCheck'?: string;
    };
  };
  status?: {
    completionTime: string;
    conditions: [{
      status: string;
    }];
  };
  spec: {
    taskRef: {
      name: string;
      kind: string;
    };
  };
};


export class TaskRun extends TektonNodeImpl {
  private started: string;
  private finished: string;
  constructor(parent: TektonNode,
    name: string,
    tkn: Tkn,
    item: PipelineTaskRunData) {
    super(parent, name, ContextType.TASKRUN, tkn, TreeItemCollapsibleState.None, item.metadata?.uid, item.metadata.creationTimestamp, item.status ? item.status.conditions[0].status : '');
    this.started = item.metadata.creationTimestamp;
    this.finished = item.status?.completionTime;
  }

  get label(): string {
    return this.name;
  }

  get description(): string {
    let r = '';
    if (this.getParent() && this.getParent().contextValue === ContextType.TASK) {
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

export abstract class BaseTaskRun extends TektonNodeImpl {
  constructor(parent: TektonNode,
    name: string,
    protected shortName: string,
    contextType: ContextType,
    tkn: Tkn,
    collapsibleState: TreeItemCollapsibleState,
    uid: string,
    creationTime: string,
    protected finished: string | undefined,
    status: TaskRunStatus | ConditionCheckStatus) {
    super(parent, name, contextType, tkn, collapsibleState, uid, creationTime, getPipelineRunTaskState(status));
  }

  get label(): string {
    return this.shortName ? this.shortName : this.name;
  }

  get description(): string {
    let r = '';
    if (this.getParent().contextValue === ContextType.TASK) {
      if (this.creationTime) {
        r = 'started ' + humanizer(Date.now() - Date.parse(this.creationTime)) + ' ago, finished in ' + humanizer(Date.parse(this.finished) - Date.parse(this.creationTime));
      } else {
        r = 'started ' + humanizer(Date.now() - Date.parse(this.creationTime)) + ' ago, running for ' + humanizer(Date.now() - Date.parse(this.creationTime));
      }
    } else {
      if (this.finished) {
        r = 'finished in ' + humanizer(Date.parse(this.finished) - Date.parse(this.creationTime));
      } else {
        r = 'running for ' + humanizer(Date.now() - Date.parse(this.creationTime));
      }
    }
    return r;
  }

  get iconPath(): Uri {
    if (this.state) {
      let filePath = IMAGES;
      if (this.state) {
        switch (this.state) {
          case 'Failed': {
            filePath = ERROR_PATH;
            break;
          }
          case 'Finished': {
            filePath = IMAGES;
            break;
          }
          case 'Cancelled':
            filePath = ERROR_PATH;
            break;

          case 'Started':
            return Uri.file(path.join(__dirname, IMAGES, 'running.gif'));

          case 'Unknown':
          default:
            filePath = PENDING_PATH;
            break;
        }
      }
      return Uri.file(path.join(__dirname, filePath, this.CONTEXT_DATA[this.contextValue].icon));
    }
    return super.iconPath;
  }
}

export class ConditionRun extends BaseTaskRun {
  constructor(parent: TektonNode, name: string, shortName: string, tkn: Tkn, item: PipelineRunConditionCheckStatus, uid: string) {
    super(parent, name, shortName, ContextType.CONDITIONTASKRUN, tkn, TreeItemCollapsibleState.None, uid, item.status?.startTime, item.status?.completionTime, item.status)
  }
}

export class TaskRunFromPipeline extends BaseTaskRun {
  constructor(parent: TektonNode, name: string, shortName: string, tkn: Tkn, private rawTaskRun: RawTaskRun, uid: string) {
    super(parent,
      name,
      shortName,
      ContextType.TASKRUN,
      tkn,
      rawTaskRun.conditionChecks ? TreeItemCollapsibleState.Collapsed : TreeItemCollapsibleState.None,
      uid,
      rawTaskRun.status?.startTime,
      rawTaskRun.status?.completionTime,
      rawTaskRun.status);
  }

  getChildren(): ProviderResult<TektonNode[]> {
    if (this.rawTaskRun.conditionChecks) {
      const result = []
      for (const conditionName in this.rawTaskRun.conditionChecks) {
        const rawCondition = this.rawTaskRun.conditionChecks[conditionName];
        result.push(new ConditionRun(this, conditionName, rawCondition.conditionName, this.tkn, rawCondition, this.uid));
      }
      return result.sort(compareTimeNewestFirst);
    } else {
      return super.getChildren();
    }
  }
}

export class PipelineRun extends TektonNodeImpl {
  private started: string;
  private finished: string;
  private item: PipelineRunData;
  private reason: string;
  constructor(parent: TektonNode,
    name: string,
    tkn: Tkn,
    item: PipelineRunData,
    collapsibleState: TreeItemCollapsibleState) {
    super(parent, name, ContextType.PIPELINERUN, tkn, collapsibleState, item.metadata?.uid, item.metadata.creationTimestamp, item.status ? item.status.conditions[0].status : '');
    this.started = item.metadata.creationTimestamp;
    this.finished = item.status?.completionTime;
    this.reason = item.status?.conditions[0] ? `(${item.status?.conditions[0].reason})` : '';
    this.item = item;
  }

  get label(): string {
    return this.name;
  }

  get tooltip(): string {
    return format(`${this.CONTEXT_DATA[this.contextValue].tooltip} ${this.reason}`, this);
  }

  get description(): string {
    let r = '';
    if (this.finished) {
      r = `started ${humanizer(Date.now() - Date.parse(this.started))} ago, finished in ${humanizer(Date.parse(this.finished) - Date.parse(this.started))}`;
    } else {
      r = `running for ${humanizer(Date.now() - Date.parse(this.started))}`;
    }
    return r;
  }

  getChildren(): ProviderResult<TektonNode[]> {
    const result = [];
    const tasks = this.item.status?.taskRuns;
    if (!tasks) {
      return result;
    }
    for (const task in tasks) {
      const taskRun = tasks[task];
      result.push(new TaskRunFromPipeline(this, task, taskRun.pipelineTaskName, this.tkn, taskRun, this.uid));
    }

    return result.sort(compareTimeNewestFirst);
  }

  async refresh(): Promise<void> {
    const newItem = await this.tkn.getRawPipelineRun(this.item.metadata.name);
    if (newItem) {
      this.item = newItem;
    }
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

  refresh(): Promise<void> {
    return Promise.resolve();
  }
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

function compareTimeNewestFirst(a: TektonNode, b: TektonNode): number {
  const aTime = Date.parse(a.creationTime);
  const bTime = Date.parse(b.creationTime);
  return aTime < bTime ? 1 : -1;
}

export function getStderrString(data: string | Error): string {
  if (data instanceof Error) {
    return data.message;
  } else if ((typeof data === 'string')) {
    return data;
  }
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
    let pipelines: NameId[] = data.map((value) => {
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
    if (result.error) {
      return [new TektonNodeImpl(trigerResource, getStderrString(result.error), triggerContextType, this, TreeItemCollapsibleState.Expanded)];
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

}

export const tkn = new TknImpl();
