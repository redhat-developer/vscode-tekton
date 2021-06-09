/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import * as cliInstance from '../cli';
import { TektonItem } from './tektonitem';
import { ViewColumn, window } from 'vscode';
import { Command } from '../cli-command';
import { K8sTask, TknResource } from '../tekton';
import { collectWizardContent } from './collect-data-for-wizard';
import { PipelineWizard } from '../pipeline/wizard';
import { telemetryLogError } from '../telemetry';
import { startTaskOrClusterTaskFromJson } from './start-task-or-clustertask-from-yaml';
import { ClusterTaskModel, TaskModel } from '../util/resource-kind';


export async function createWizardForTaskOrClusterTask(taskName: string, kind: string, commandId?: string): Promise<string> {
  if (!taskName) return null;
  let task: K8sTask;
  const result: cliInstance.CliExitData = await TektonItem.tkn.execute(Command.getTask(taskName, (kind === TaskModel.kind) ? 'task.tekton' : 'clustertask'), process.cwd(), false);
  if (result.error) {
    return window.showErrorMessage(`Fail to fetch task info reason: ${result.error}`);
  }
  try {
    task = JSON.parse(result.stdout);
  } catch (err) {
    const error = `Fail to parse Json data for ${taskName}, error: ${err}`;
    if (commandId) telemetryLogError(commandId, error);
    return window.showErrorMessage(error);
  }

  const resource: TknResource[] = [];
  if (task.spec.resources) {
    Object.keys(task.spec.resources).map(label => {
      task.spec.resources[label].map((value) => {
        value.resourceType = label;
        resource.push(value);
      });
    });
  }
  const trigger = await collectWizardContent(task.metadata.name, task.spec.params, (resource && resource.length !== 0) ? resource : undefined, task.spec.workspaces, false);
  if (commandId) trigger.commandId = commandId;
  if (kind === TaskModel.kind) {
    trigger.startTask = true;
  } else if (kind === ClusterTaskModel.kind) {
    trigger.startClusterTask = true;
  }
  if (!trigger.workspaces && !trigger.resources && !trigger.params) {
    delete trigger.serviceAccount;
    await startTaskOrClusterTaskFromJson(trigger);
  } else {
    PipelineWizard.create({ trigger, resourceColumn: ViewColumn.Active }, ViewColumn.Active, `Start ${kind}`, trigger.name);
  }
}
