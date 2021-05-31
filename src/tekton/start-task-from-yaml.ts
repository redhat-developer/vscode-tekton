/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { window } from 'vscode';
import { cli } from '../cli';
import { Command } from '../cli-command';
import { KubectlTask, StartObject, TknTaskRun } from '../tekton';
import { telemetryLogError } from '../telemetry';
import { getParams, getTaskRunResources, getWorkspaces } from '../util/create-resource-spec';
import { TaskRunModel } from '../util/resource-kind';
import { k8sCreate } from './addtrigger';

export async function startTaskFromJson(formValue: StartObject): Promise<boolean> {
  const taskRunJson = await getTaskRun(formValue, formValue.commandId);
  return await k8sCreate(taskRunJson, formValue.commandId, TaskRunModel.kind);
}

export async function getTaskRun(formValue: StartObject, commandId?: string): Promise<TknTaskRun> {
  const taskRunData: TknTaskRun = {
    metadata: {
    },
    spec: {
      params: getParams(formValue.params),
      resources: getTaskRunResources(formValue.resources),
      workspaces: getWorkspaces(formValue.workspaces, formValue.volumeClaimTemplate),
      taskRef: {
        name: formValue.name,
      },
    },
  };
  if (formValue.serviceAccount) {
    taskRunData.spec.serviceAccountName = formValue.serviceAccount;
  }
  const result = await cli.execute(Command.getTask(formValue.name, 'task.tekton'));
  let task: KubectlTask;
  if (result.error) {
    telemetryLogError(commandId, result.error.toString())
    window.showErrorMessage(`fail to fetch Task: ${result.error}`);
    return;
  }
  try {
    task = JSON.parse(result.stdout);
  } catch (ignore) {
    window.showErrorMessage(`fail to Parse Task: ${formValue.name}`)
  }
  return getTaskRunData(task, taskRunData);
}

function getTaskRunData(task: KubectlTask, taskRunData: TknTaskRun): TknTaskRun {
  const taskName = task.metadata.name;
  const resources = taskRunData?.spec.resources;
  const workspaces = taskRunData?.spec.workspaces;
  const params = taskRunData?.spec.params;
  const serviceAccountName = taskRunData?.spec.serviceAccountName;

  const newTaskRun: TknTaskRun = {
    apiVersion: task.apiVersion,
    kind: TaskRunModel.kind,
    metadata: {
      generateName: `${taskName}-`,
      namespace: task.metadata.namespace,
    },
    spec: {
      taskRef: {
        name: taskName,
      },
      resources,
      params,
      workspaces
    },
  };
  if (serviceAccountName) {
    newTaskRun.spec.serviceAccountName = serviceAccountName;
  }
  return newTaskRun;
}
