/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { workspace } from 'vscode';
import { CliCommand, createCliCommand } from './cli';


export function newTknCommand(...tknArguments: string[]): CliCommand {
  return createCliCommand('tkn', ...tknArguments);
}

export function newK8sCommand(...k8sArguments: string[]): CliCommand {
  return createCliCommand('kubectl', ...k8sArguments);
}

export function newOcCommand(...OcArguments: string[]): CliCommand {
  return createCliCommand('oc', ...OcArguments);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function verbose(_target: unknown, key: string, descriptor: any): void {
  let fnKey: string | undefined;
  // eslint-disable-next-line @typescript-eslint/ban-types
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

export class Command {
  @verbose
  static listTaskRunsForTasks(task: string): CliCommand {
    return newK8sCommand('get', 'taskrun', '-l', `tekton.dev/task=${task}`, '-o', 'json');
  }

  static printOcVersionJson(): CliCommand {
    return newOcCommand('version -ojson');
  }

  static listTaskRunsForClusterTasks(clusterTask: string): CliCommand {
    return newK8sCommand('get', 'taskrun', '-l', `tekton.dev/clusterTask=${clusterTask}`, '-o', 'json');
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
  static describePipelines(name: string): CliCommand {
    return newTknCommand('pipeline', 'describe', name);
  }

  @verbose
  static listPipelineRuns(name: string): CliCommand {
    return newK8sCommand('get', 'pipelinerun', '-l', `tekton.dev/pipeline=${name}`, '-o', 'json');
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
