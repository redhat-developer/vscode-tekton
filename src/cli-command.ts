/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { workspace } from 'vscode';
import { CliCommand, createCliCommand } from './cli';
import { ocFallBack } from './util/check-cluster-status';


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

  static printOcVersionJson(): CliCommand {
    return newOcCommand('version', '-o', 'json');
  }

  static kubectlVersion(): CliCommand {
    return newK8sCommand('version', '-o', 'json');
  }

  static listTaskRunsForTasks(task: string): CliCommand {
    if (ocFallBack.get('ocFallBack')) {
      return newOcCommand('get', 'taskrun', '-l', `tekton.dev/task=${task}`, '-o', 'json');
    } else {
      return newK8sCommand('get', 'taskrun', '-l', `tekton.dev/task=${task}`, '-o', 'json');
    }
  }

  static listTaskRunsForClusterTasks(clusterTask: string): CliCommand {
    if (ocFallBack.get('ocFallBack')) {
      return newOcCommand('get', 'taskrun', '-l', `tekton.dev/clusterTask=${clusterTask}`, '-o', 'json');
    } else {
      return newK8sCommand('get', 'taskrun', '-l', `tekton.dev/clusterTask=${clusterTask}`, '-o', 'json');
    }
  }

  static resourceList(resource: string): CliCommand {
    if (ocFallBack.get('ocFallBack')) {
      return newOcCommand('get', resource, '-o', 'json');
    } else {
      return newK8sCommand('get', resource, '-o', 'json');
    }
  }

  static getTaskRun(taskRunName: string): CliCommand {
    if (ocFallBack.get('ocFallBack')) {
      return newOcCommand('get', 'taskrun', taskRunName, '-o', 'json');
    } else {
      return newK8sCommand('get', 'taskrun', taskRunName, '-o', 'json');
    }
  }

  @verbose
  static listTaskRunsForTasksInTerminal(task: string): CliCommand {
    return newTknCommand('taskrun', 'list', task);
  }

  static restartPipeline(name: string): CliCommand {
    return newTknCommand('pipeline', 'start', name, '--last', '-s', 'pipeline');
  }

  @verbose
  static deletePipeline(name: string): CliCommand {
    if (ocFallBack.get('ocFallBack')) {
      return newOcCommand('delete', 'Pipeline', name);
    } else {
      return newK8sCommand('delete', 'Pipeline', name);
    }
  }

  @verbose
  static listPipelineResources(): CliCommand {
    if (ocFallBack.get('ocFallBack')) {
      return newOcCommand('get', 'pipelineresources', '-o', 'json');
    } else {
      return newK8sCommand('get', 'pipelineresources', '-o', 'json');
    }
  }

  static listTriggerTemplates(): CliCommand {
    if (ocFallBack.get('ocFallBack')) {
      return newOcCommand('get', 'triggertemplates', '-o', 'json');
    } else {
      return newK8sCommand('get', 'triggertemplates', '-o', 'json');
    }
  }

  static listTriggerBinding(): CliCommand {
    if (ocFallBack.get('ocFallBack')) {
      return newOcCommand('get', 'triggerbinding', '-o', 'json');
    } else {
      return newK8sCommand('get', 'triggerbinding', '-o', 'json');
    }
  }

  static listClusterTriggerBinding(): CliCommand {
    if (ocFallBack.get('ocFallBack')) {
      return newOcCommand('get', 'clustertriggerbinding', '-o', 'json');
    } else {
      return newK8sCommand('get', 'clustertriggerbinding', '-o', 'json');
    }
  }

  static deleteClusterTriggerBinding(name: string): CliCommand {
    if (ocFallBack.get('ocFallBack')) {
      return newOcCommand('delete', 'ClusterTriggerBinding', name);
    } else {
      return newK8sCommand('delete', 'ClusterTriggerBinding', name);
    }
  }

  @verbose
  static listEventListener(): CliCommand {
    if (ocFallBack.get('ocFallBack')) {
      return newOcCommand('get', 'eventlistener', '-o', 'json');
    } else {
      return newK8sCommand('get', 'eventlistener', '-o', 'json');
    }
  }

  static featureFlags(): CliCommand {
    if (ocFallBack.get('ocFallBack')) {
      return newOcCommand('get', '-n', 'tekton-pipelines', 'configmap', 'feature-flags', '-o', 'json');
    } else {
      return newK8sCommand('get', '-n', 'tekton-pipelines', 'configmap', 'feature-flags', '-o', 'json');
    }
  }

  static deleteTriggerTemplate(name: string): CliCommand {
    if (ocFallBack.get('ocFallBack')) {
      return newOcCommand('delete', 'TriggerTemplate', name);
    } else {
      return newK8sCommand('delete', 'TriggerTemplate', name);
    }
  }

  static deleteTriggerBinding(name: string): CliCommand {
    if (ocFallBack.get('ocFallBack')) {
      return newOcCommand('delete', 'TriggerBinding', name);
    } else {
      return newK8sCommand('delete', 'TriggerBinding', name);
    }
  }

  static deleteCondition(name: string): CliCommand {
    if (ocFallBack.get('ocFallBack')) {
      return newOcCommand('delete', 'Condition', name);
    } else {
      return newK8sCommand('delete', 'Condition', name);
    }
  }

  static deleteEventListeners(name: string): CliCommand {
    if (ocFallBack.get('ocFallBack')) {
      return newOcCommand('delete', 'EventListener', name);
    } else {
      return newK8sCommand('delete', 'EventListener', name);
    }
  }

  @verbose
  static describePipelineResource(name: string): CliCommand {
    return newTknCommand('resource', 'describe', name);
  }

  static deletePipelineResource(name: string): CliCommand {
    if (ocFallBack.get('ocFallBack')) {
      return newOcCommand('delete', 'PipelineResource', name);
    } else {
      return newK8sCommand('delete', 'PipelineResource', name);
    }
  }

  static listPipelines(): CliCommand {
    if (ocFallBack.get('ocFallBack')) {
      return newOcCommand('get', 'pipeline', '-o', 'json');
    } else {
      return newK8sCommand('get', 'pipeline', '-o', 'json');
    }
  }

  @verbose
  static describePipelines(name: string): CliCommand {
    return newTknCommand('pipeline', 'describe', name);
  }

  @verbose
  static listPipelineRuns(name: string): CliCommand {
    if (ocFallBack.get('ocFallBack')) {
      return newOcCommand('get', 'pipelinerun', '-l', `tekton.dev/pipeline=${name}`, '-o', 'json');
    } else {
      return newK8sCommand('get', 'pipelinerun', '-l', `tekton.dev/pipeline=${name}`, '-o', 'json');
    }
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
    if (ocFallBack.get('ocFallBack')) {
      return newOcCommand('delete', 'PipelineRun', name);
    } else {
      return newK8sCommand('delete', 'PipelineRun', name);
    }
  }

  @verbose
  static showPipelineRunLogs(name: string): CliCommand {
    return newTknCommand('pipelinerun', 'logs', name);
  }

  static showDiagnosticData(name: string): CliCommand {
    if (ocFallBack.get('ocFallBack')) {
      return newOcCommand('get', 'pods', name, '-o', 'jsonpath=\'{range .status.conditions[?(.reason)]}{"reason: "}{.reason}{"\\n"}{"message: "}{.message}{"\\n"}{end}\'');
    } else {
      return newK8sCommand('get', 'pods', name, '-o', 'jsonpath=\'{range .status.conditions[?(.reason)]}{"reason: "}{.reason}{"\\n"}{"message: "}{.message}{"\\n"}{end}\'');
    }
  }

  static getPipelineRunAndTaskRunData(resource: string, name: string): CliCommand {
    if (ocFallBack.get('ocFallBack')) {
      return newOcCommand('get', resource, name, '-o', 'json');
    } else {
      return newK8sCommand('get', resource, name, '-o', 'json');
    }
  }

  @verbose
  static listTasks(namespace?: string): CliCommand {
    if (ocFallBack.get('ocFallBack')) {
      return newOcCommand('get', 'task.tekton', ...(namespace ? ['-n', namespace] : ''), '-o', 'json');
    } else {
      return newK8sCommand('get', 'task.tekton', ...(namespace ? ['-n', namespace] : ''), '-o', 'json');
    }
  }

  static listTaskRunsForPipelineRun(pipelineRunName: string): CliCommand {
    if (ocFallBack.get('ocFallBack')) {
      return newOcCommand('get', 'taskrun', '-l', `tekton.dev/pipelineRun=${pipelineRunName}`, '-o', 'json');
    } else {
      return newK8sCommand('get', 'taskrun', '-l', `tekton.dev/pipelineRun=${pipelineRunName}`, '-o', 'json');
    }
  }

  static listTaskRunsForPipelineRunInTerminal(pipelineRunName: string): CliCommand {
    if (ocFallBack.get('ocFallBack')) {
      return newOcCommand('get', 'taskrun', '-l', `tekton.dev/pipelineRun=${pipelineRunName}`);
    } else {
      return newK8sCommand('get', 'taskrun', '-l', `tekton.dev/pipelineRun=${pipelineRunName}`);
    }
  }

  static getTask(name: string, type: 'clustertask' | 'task.tekton'): CliCommand {
    if (ocFallBack.get('ocFallBack')) {
      return newOcCommand('get', type, name, '-o', 'json');
    } else {
      return newK8sCommand('get', type, name, '-o', 'json');
    }
  }

  @verbose
  static deleteTask(name: string): CliCommand {
    if (ocFallBack.get('ocFallBack')) {
      return newOcCommand('delete', 'Task', name);
    } else {
      return newK8sCommand('delete', 'Task', name);
    }
  }

  @verbose
  static listClusterTasks(namespace?: string): CliCommand {
    if (ocFallBack.get('ocFallBack')) {
      return newOcCommand('get', 'clustertask', ...(namespace ? ['-n', namespace] : ''), '-o', 'json');
    } else {
      return newK8sCommand('get', 'clustertask', ...(namespace ? ['-n', namespace] : ''), '-o', 'json');
    }
  }

  @verbose
  static deleteClusterTask(name: string): CliCommand {
    if (ocFallBack.get('ocFallBack')) {
      return newOcCommand('delete', 'ClusterTask', name);
    } else {
      return newK8sCommand('delete', 'ClusterTask', name);
    }
  }

  @verbose
  static showTaskRunLogs(name: string): CliCommand {
    return newTknCommand('taskrun', 'logs', name);
  }

  @verbose
  static deleteTaskRun(name: string): CliCommand {
    if (ocFallBack.get('ocFallBack')) {
      return newOcCommand('delete', 'TaskRun', name);
    } else {
      return newK8sCommand('delete', 'TaskRun', name);
    }
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
    if (ocFallBack.get('ocFallBack')) {
      return newOcCommand('auth', 'can-i', 'create', 'pipeline.tekton.dev', '&&', 'kubectl', 'get', 'pipeline.tekton.dev');
    } else {
      return newK8sCommand('auth', 'can-i', 'create', 'pipeline.tekton.dev', '&&', 'kubectl', 'get', 'pipeline.tekton.dev');
    }
  }

  static updateYaml(fsPath: string): CliCommand {
    if (ocFallBack.get('ocFallBack')) {
      return newOcCommand('apply', '-f', fsPath);
    } else {
      return newK8sCommand('apply', '-f', fsPath);
    }
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
    if (ocFallBack.get('ocFallBack')) {
      return newOcCommand('get', 'taskrun', '-o', 'json');
    } else {
      return newK8sCommand('get', 'taskrun', '-o', 'json');
    }
  }

  static listConditions(): CliCommand {
    if (ocFallBack.get('ocFallBack')) {
      return newOcCommand('get', 'conditions', '-o', 'json');
    } else {
      return newK8sCommand('get', 'conditions', '-o', 'json');
    }
  }

  static listPipelineRun(): CliCommand {
    if (ocFallBack.get('ocFallBack')) {
      return newOcCommand('get', 'pipelinerun', '-o', 'json');
    } else {
      return newK8sCommand('get', 'pipelinerun', '-o', 'json');
    }
  }

  static watchResources(resourceName: string, name: string): CliCommand {
    if (ocFallBack.get('ocFallBack')) {
      return newOcCommand('get', resourceName, name, '-w', '-o', 'json');
    } else {
      return newK8sCommand('get', resourceName, name, '-w', '-o', 'json');
    }
  }

  static loginToContainer(container: string, podName: string, namespace: string): CliCommand {
    if (ocFallBack.get('ocFallBack')) {
      return newOcCommand('exec', '-it', '-n', namespace, '-c', container, podName, '--', 'bash');
    } else {
      return newK8sCommand('exec', '-it', '-n', namespace, '-c', container, podName, '--', 'bash');
    }
  }

  static isContainerStoppedOnDebug(container: string, podName: string, namespace: string): CliCommand {
    if (ocFallBack.get('ocFallBack')) {
      return newOcCommand('exec', '-it', '-n', namespace, '-c', container, podName, '--', 'awk \'END{print NR}\' tekton/termination');
    } else {
      return newK8sCommand('exec', '-it', '-n', namespace, '-c', container, podName, '--', 'awk \'END{print NR}\' tekton/termination');
    }
  }

  static debugContinue(container: string, podName: string, namespace: string): CliCommand {
    if (ocFallBack.get('ocFallBack')) {
      return newOcCommand('exec', '-it', '-n', namespace, '-c', container, podName, '--', '/tekton/debug/scripts/debug-continue');
    } else {
      return newK8sCommand('exec', '-it', '-n', namespace, '-c', container, podName, '--', '/tekton/debug/scripts/debug-continue');
    }
  }

  static debugFailContinue(container: string, podName: string, namespace: string): CliCommand {
    if (ocFallBack.get('ocFallBack')) {
      return newOcCommand('exec', '-it', '-n', namespace, '-c', container, podName, '--', '/tekton/debug/scripts/debug-fail-continue');
    } else {
      return newK8sCommand('exec', '-it', '-n', namespace, '-c', container, podName, '--', '/tekton/debug/scripts/debug-fail-continue');
    }
  }

  static cancelTaskRun(name: string): CliCommand {
    return newTknCommand('taskrun', 'cancel', name);
  }

  static workspace(name: string): CliCommand {
    if (ocFallBack.get('ocFallBack')) {
      return newOcCommand('get', name, '-o', 'json');
    } else {
      return newK8sCommand('get', name, '-o', 'json');
    }
  }

  static getPipelineResource(): CliCommand {
    if (ocFallBack.get('ocFallBack')) {
      return newOcCommand('get', 'pipelineresources', '-o', 'json');
    } else {
      return newK8sCommand('get', 'pipelineresources', '-o', 'json');
    }
  }

  static getPipelineRun(name: string): CliCommand {
    if (ocFallBack.get('ocFallBack')) {
      return newOcCommand('get', 'pipelinerun', name, '-o', 'json');
    } else {
      return newK8sCommand('get', 'pipelinerun', name, '-o', 'json');
    }
  }

  static getPipeline(name: string): CliCommand {
    if (ocFallBack.get('ocFallBack')) {
      return newOcCommand('get', 'pipeline', name, '-o', 'json');
    } else {
      return newK8sCommand('get', 'pipeline', name, '-o', 'json');
    }
  }

  static getEventListener(name: string): CliCommand {
    if (ocFallBack.get('ocFallBack')) {
      return newOcCommand('get', 'el', name, '-o', 'json');
    } else {
      return newK8sCommand('get', 'el', name, '-o', 'json');
    }
  }

  static getService(name: string): CliCommand {
    if (ocFallBack.get('ocFallBack')) {
      return newOcCommand('get', 'Service', name, '-o', 'json');
    } else {
      return newK8sCommand('get', 'Service', name, '-o', 'json');
    }
  }

  static create(file: string): CliCommand {
    if (ocFallBack.get('ocFallBack')) {
      return newOcCommand('create', '--save-config', '-f', file);
    } else {
      return newK8sCommand('create', '--save-config', '-f', file);
    }
  }

  static apply(file: string): CliCommand {
    if (ocFallBack.get('ocFallBack')) {
      return newOcCommand('apply', '-f', file);
    } else {
      return newK8sCommand('apply', '-f', file);
    }
  }

  static getRoute(name: string): CliCommand {
    if (ocFallBack.get('ocFallBack')) {
      return newOcCommand('get', 'route', name, '-o', 'json');
    } else {
      return newK8sCommand('get', 'route', name, '-o', 'json');
    }
  }

  static getTrigger(name: string): CliCommand {
    if (ocFallBack.get('ocFallBack')) {
      return newOcCommand('get', 'trigger', name, '-o', 'json');
    } else {
      return newK8sCommand('get', 'trigger', name, '-o', 'json');
    }
  }
}
