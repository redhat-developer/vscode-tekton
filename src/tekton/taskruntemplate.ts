/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import * as yaml from 'js-yaml';
import { newK8sCommand, TektonNode } from '../tkn';
import * as vscode from 'vscode';
import { Task, TaskRunTemplate } from '../tekton';
import { cli } from '../cli';
import sendTelemetry, { telemetryProperties, TelemetryProperties } from '../telemetry';

async function getTask(name: string): Promise<Task> {
  const task = await cli.execute(newK8sCommand(`get task ${name} -o json`));
  const taskData = JSON.parse(task.stdout);
  return taskData;
}

function getInputsOutputs(task: Task, taskRunTemplate: TaskRunTemplate): void {
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

function workspace(task: Task, taskRunTemplate: TaskRunTemplate): void {
  if (task.spec.workspaces && task.spec.workspaces.length !== 0) {
    const workspacesContent = task.spec.workspaces.map(value => {
      return {name: value.name, emptyDir: {}};
    });
    taskRunTemplate.spec['workspaces'] = workspacesContent;
  }
}

function getParams(task: Task, taskRunTemplate: TaskRunTemplate): void {
  if (task.spec.params && task.spec.params.length !== 0) {
    const params = task.spec.params.map(value => {
      return {name: value.name, value: 'Change Me'};
    });
    taskRunTemplate.spec['params'] = params;
  }
}

function serviceAccountName(taskRunTemplate: TaskRunTemplate): void {
  taskRunTemplate.spec['serviceAccountName'] = 'Change Me';
}

function taskRef(taskRefName: string, taskRunTemplate: TaskRunTemplate): void {
  taskRunTemplate.spec['taskRef'] = {
    kind: 'Task',
    name: taskRefName
  };
}

function defaultStructureForTaskRun(): TaskRunTemplate {
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

export async function openTaskRunTemplate(context: TektonNode, commandId?: string): Promise<void> {
  const task = await getTask(context.getName());
  const taskRunTemplate = defaultStructureForTaskRun();
  getParams(task, taskRunTemplate);
  getInputsOutputs(task, taskRunTemplate);
  workspace(task, taskRunTemplate);
  serviceAccountName(taskRunTemplate);
  taskRef(context.getName(), taskRunTemplate);
  const taskRunYaml = yaml.dump(taskRunTemplate);
  if (commandId) {
    const telemetryProps: TelemetryProperties = telemetryProperties(commandId);
    telemetryProps['message'] = 'Task successfully started';
    sendTelemetry(commandId, telemetryProps);
  }
  vscode.workspace.openTextDocument({content: taskRunYaml, language: 'yaml'}).then(doc => {
    vscode.window.showTextDocument(doc, {preview: false})
  })
}
