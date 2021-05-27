/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { workspace } from 'vscode';
import { CliCommand, createCliCommand } from './cli';
import { StartObject } from './tekton';


export function newTknCommand(...tknArguments: string[]): CliCommand {
  return createCliCommand('tkn', ...tknArguments);
}

export function newK8sCommand(...k8sArguments: string[]): CliCommand {
  return createCliCommand('kubectl', ...k8sArguments);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function verbose(_target: unknown, key: string, descriptor: any): void {
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
    } else if (element.workspaceType === 'EmptyDirectory' || element.workspaceType === 'EmptyDir') {
      workspace.push(`-w name=${element.name},emptyDir=''`);
    }
  });
  return workspace;
}

export class Command {
  @verbose
  static listTaskRunsForTasks(task: string): CliCommand {
    return newK8sCommand('get', 'taskrun', '-l', `tekton.dev/task=${task}`, '-o', 'json');
  }

  static resourceList(resource: string): CliCommand {
    return newK8sCommand('get', resource, '-o', 'json');
  }

  static getTaskRun(taskRunName: string): CliCommand {
    return newK8sCommand('get', 'taskrun', taskRunName, '-o', 'json');
  }

  @verbose
  static listTaskRunsForTasksInTerminal(task: string): CliCommand {
    return newTknCommand('taskrun', 'list', task);
  }

  @verbose
  static startTask(taskData: StartObject): CliCommand {
    const resources: string[] = [];
    const params: string[] = [];
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

    taskData.params.forEach(element => {
      params.push('--param');
      params.push(element.name + '=' + element.default);
    });

    const workspace = tknWorkspace(taskData);

    return newTknCommand('task', 'start', taskData.name, ...resources, ...params, ...workspace, ...svcAcct);
  }

  @verbose
  static restartPipeline(name: string): CliCommand {
    return newTknCommand('pipeline', 'start', name, '--last', '-s', 'pipeline');
  }

  @verbose
  static deletePipeline(name: string): CliCommand {
    return newK8sCommand('delete', 'Pipeline', name);
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
    return newK8sCommand('delete', 'ClusterTriggerBinding', name);
  }

  @verbose
  static listEventListener(): CliCommand {
    return newK8sCommand('get', 'eventlistener', '-o', 'json');
  }

  static deleteTriggerTemplate(name: string): CliCommand {
    return newK8sCommand('delete', 'TriggerTemplate', name);
  }

  static deleteTriggerBinding(name: string): CliCommand {
    return newK8sCommand('delete', 'TriggerBinding', name);
  }

  static deleteCondition(name: string): CliCommand {
    return newK8sCommand('delete', 'Condition', name);
  }

  static deleteEventListeners(name: string): CliCommand {
    return newK8sCommand('delete', 'EventListener', name);
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
    return newK8sCommand('delete', 'PipelineResource', name);
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
    return newK8sCommand('delete', 'PipelineRun', name);
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
    return newK8sCommand('get', 'task.tekton', ...(namespace ? ['-n', namespace] : ''), '-o', 'json');
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

  static getTask(name: string, type: 'clustertask' | 'task.tekton'): CliCommand {
    return newK8sCommand('get', type, name, '-o', 'json');
  }

  @verbose
  static deleteTask(name: string): CliCommand {
    return newK8sCommand('delete', 'Task', name);
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
    return newK8sCommand('delete', 'ClusterTask', name);
  }

  @verbose
  static showTaskRunLogs(name: string): CliCommand {
    return newTknCommand('taskrun', 'logs', name);
  }

  @verbose
  static deleteTaskRun(name: string): CliCommand {
    return newK8sCommand('delete', 'TaskRun', name);
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

  static checkTekton(): CliCommand {
    return newK8sCommand('auth', 'can-i', 'create', 'pipeline.tekton.dev', '&&', 'kubectl', 'get', 'pipeline.tekton.dev');
  }

  static updateYaml(fsPath: string): CliCommand {
    return newK8sCommand('apply', '-f', fsPath);
  }

  static hubInstall(name: string, version: string): CliCommand {
    return newTknCommand('hub', 'install', 'task', name, '--version', version);
  }

  static hubTaskUpgrade(name: string, version: string): CliCommand {
    return newTknCommand('hub', 'upgrade', 'task', name, '--to', version);
  }

  static hubTaskDowngrade(name: string, version: string): CliCommand {
    return newTknCommand('hub', 'downgrade', 'task', name, '--to', version);
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
