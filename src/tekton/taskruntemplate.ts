/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import * as yaml from 'js-yaml';
import { newK8sCommand, TektonNode } from '../tkn';
import * as vscode from 'vscode';
import { Task, TaskRunTemplate } from '../tekton';
import { cli } from '../cli';

async function getTask(name: string): Promise<Task> {
  const task = await cli.execute(newK8sCommand(`get task ${name} -o json`));
  const taskData = JSON.parse(task.stdout);
  return taskData;
}

function getInputsOutputs(getTaskData: Task, taskRunTemplate: TaskRunTemplate): void {
  const resources = {};
  if (getTaskData.spec.resources?.outputs && getTaskData.spec.resources?.outputs.length !== 0) {
    const outputs = [];
    getTaskData.spec.resources.outputs.forEach((value) => {
      outputs.push({name: value.name, resourceRef: {name: 'Change Me'}});
    });
    resources['outputs'] = outputs;
  }

  if (getTaskData.spec.resources?.inputs && getTaskData.spec.resources?.inputs.length !== 0) {
    const inputs = [];
    getTaskData.spec.resources.inputs.forEach((value) => {
      inputs.push({name: value.name, resourceRef: {name: 'Change Me'}});
    });
    resources['inputs'] = inputs;
  }
  if (Object.keys(resources).length !== 0) taskRunTemplate.spec['resources'] = resources;
}

function workspace(getTaskData: Task, taskRunTemplate: TaskRunTemplate): void {
  const workspacesContent = [];
  if (getTaskData.spec.workspaces && getTaskData.spec.workspaces.length !== 0) {
    getTaskData.spec.workspaces.forEach(value => {
      workspacesContent.push({name: value.name, emptyDir: {}});
    });
    taskRunTemplate.spec['workspaces'] = workspacesContent;
  }
}

function getParams(getTaskData: Task, taskRunTemplate: TaskRunTemplate): void {
  const params = [];
  if (getTaskData.spec.params && getTaskData.spec.params.length !== 0) {
    getTaskData.spec.params.forEach(value => {
      params.push({name: value.name, value: 'Change Me'});
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

export async function openTaskRunTemplate(context: TektonNode): Promise<void> {
  const getTaskData = await getTask(context.getName());
  const taskRunTemplate = defaultStructureForTaskRun();
  getParams(getTaskData, taskRunTemplate);
  getInputsOutputs(getTaskData, taskRunTemplate);
  workspace(getTaskData, taskRunTemplate);
  serviceAccountName(taskRunTemplate);
  taskRef(context.getName(), taskRunTemplate);
  const taskRunYaml = yaml.dump(taskRunTemplate);
  vscode.workspace.openTextDocument({content: taskRunYaml, language: 'yaml'}).then(doc => {
    vscode.window.showTextDocument(doc, {preview: false})
  })
}
