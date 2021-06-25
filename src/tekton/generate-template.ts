/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import * as yaml from 'js-yaml';
import * as vscode from 'vscode';
import { Task, Template, TknPipelineTrigger } from '../tekton';
import { cli } from '../cli';
import { telemetryLog } from '../telemetry';
import { newK8sCommand } from '../cli-command';
import { TektonNode } from '../tree-view/tekton-node';

async function getTask(name: string): Promise<Task> {
  const task = await cli.execute(newK8sCommand(`get task ${name} -o json`));
  const taskData = JSON.parse(task.stdout);
  return taskData;
}

async function getPipeline(name: string): Promise<TknPipelineTrigger> {
  const pipeline = await cli.execute(newK8sCommand(`get pipeline ${name} -o json`));
  const pipelineData = JSON.parse(pipeline.stdout);
  return pipelineData;
}

function getInputsOutputs(task: Task, taskRunTemplate: Template): void {
  const resources = {};
  if (task.spec.resources?.outputs && task.spec.resources?.outputs.length !== 0) {
    const outputs = task.spec.resources.outputs.map((value) => {
      return {name: value.name, resourceRef: {name: 'Change Me'}};
    });
    resources['outputs'] = outputs;
  }

  if (task.spec.resources?.inputs && task.spec.resources?.inputs.length !== 0) {
    const inputs = task.spec.resources.inputs.map((value) => {
      return {name: value.name, resourceRef: {name: 'Change Me'}};
    });
    resources['inputs'] = inputs;
  }
  if (Object.keys(resources).length !== 0) taskRunTemplate.spec['resources'] = resources;
}

function resource(k8sResource: TknPipelineTrigger, taskRunTemplate: Template): void {
  const resources = [];
  if (k8sResource.spec.resources && k8sResource.spec.resources.length !== 0) {
    k8sResource.spec.resources.map((value) => {
      resources.push({name: value.name, resourceRef: {name: 'Change Me'}});
    });
  }
  taskRunTemplate.spec['resources'] = resources;
}

function workspace(k8sResource: Task | TknPipelineTrigger, taskRunTemplate: Template): void {
  if (k8sResource.spec.workspaces && k8sResource.spec.workspaces.length !== 0) {
    const workspacesContent = k8sResource.spec.workspaces.map(value => {
      return {name: value.name, emptyDir: {}};
    });
    taskRunTemplate.spec['workspaces'] = workspacesContent;
  }
}

function getParams(k8sResource: Task | TknPipelineTrigger, taskRunTemplate: Template): void {
  if (k8sResource.spec.params && k8sResource.spec.params.length !== 0) {
    const params = k8sResource.spec.params.map(value => {
      if (value.default) {
        return {name: value.name, value: value.default};
      } else {
        return {name: value.name, value: 'Change Me'};
      }
    });
    taskRunTemplate.spec['params'] = params;
  }
}

function serviceAccountName(k8sResource: Template): void {
  k8sResource.spec['serviceAccountName'] = 'Change Me';
}

function taskRef(taskRefName: string, taskRunTemplate: Template): void {
  taskRunTemplate.spec['taskRef'] = {
    kind: 'Task',
    name: taskRefName
  };
}

function pipelineRef(pipelineRef: string, taskRunTemplate: Template): void {
  taskRunTemplate.spec['pipelineRef'] = {
    name: pipelineRef
  };
}

function defaultStructureForTaskRun(): Template {
  return {
    apiVersion: 'tekton.dev/v1beta1',
    kind: 'TaskRun',
    metadata: {
      name: 'Change Me'
    },
    spec: {
    }
  }
}

function defaultStructureForPipelineRun(): Template {
  return {
    apiVersion: 'tekton.dev/v1beta1',
    kind: 'PipelineRun',
    metadata: {
      name: 'Change Me'
    },
    spec: {
    }
  }
}

export async function openTaskRunTemplate(context: TektonNode, commandId?: string): Promise<void> {
  const task = await getTask(context.getName());
  const taskRunTemplate = defaultStructureForTaskRun();
  getParams(task, taskRunTemplate);
  getInputsOutputs(task, taskRunTemplate);
  workspace(task, taskRunTemplate);
  serviceAccountName(taskRunTemplate);
  taskRef(context.getName(), taskRunTemplate);
  const taskRunYaml = yaml.dump(taskRunTemplate);
  telemetryLog(commandId, 'Open taskRun template');
  vscode.workspace.openTextDocument({content: taskRunYaml, language: 'yaml'}).then(doc => {
    vscode.window.showTextDocument(doc, {preview: false})
  })
}

export async function openPipelineRunTemplate(context: TektonNode, commandId?: string): Promise<void> {
  if (!context) return null;
  const pipeline: TknPipelineTrigger = await getPipeline(context.getName());
  const pipelineRunTemplate = defaultStructureForPipelineRun();
  getParams(pipeline, pipelineRunTemplate);
  resource(pipeline, pipelineRunTemplate);
  workspace(pipeline, pipelineRunTemplate);
  pipelineRef(context.getName(), pipelineRunTemplate);
  serviceAccountName(pipelineRunTemplate);
  const pipelineRunYaml = yaml.dump(pipelineRunTemplate);
  telemetryLog(commandId, 'Open PipelineRun template template');
  vscode.workspace.openTextDocument({content: pipelineRunYaml, language: 'yaml'}).then(doc => {
    vscode.window.showTextDocument(doc, {preview: false})
  })
}
