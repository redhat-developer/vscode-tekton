/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { Progress } from '../util/progress';
import * as cliInstance from '../cli';
import { TektonItem } from './tektonitem';
import { Command } from '../tkn';
import { TknPipelineTrigger } from '../tekton';
import { Trigger, PipelineContent } from './pipelinecontent';

export async function startTask(taskName: string): Promise<string> {
  if (!taskName) return null;
  const result: cliInstance.CliExitData = await TektonItem.tkn.execute(Command.listTasks(), process.cwd(), false);
  let data: TknPipelineTrigger[] = [];
  if (result.error) {
    console.log(result + ' Std.err when processing task');
  }
  try {
    data = JSON.parse(result.stdout).items;
  } catch (ignore) {
    // ignore
  }

  const taskTrigger = data.filter((obj) => {
    return obj.metadata.name === taskName;
  }).map<Trigger>(value => ({
    name: value.metadata.name,
    resources: value.spec.resources,
    params: value.spec.params ? value.spec.params : undefined,
    serviceAcct: value.spec.serviceAccount ? value.spec.serviceAccount : undefined
  }));

  if (taskTrigger[0].resources) {
    const resource = [];
    Object.keys(taskTrigger[0].resources).map(label => {
      taskTrigger[0].resources[label].map((value) => {
        value.resourceType = label;
        resource.push(value);
      });
    });
    taskTrigger[0].resources = resource;
  }

  const inputStartTask = await PipelineContent.startObject(taskTrigger, 'Task');

  return Progress.execFunctionWithProgress(`Starting Task '${inputStartTask.name}'.`, () =>
    TektonItem.tkn.startTask(inputStartTask)
      .then(() => TektonItem.explorer.refresh())
      .then(() => `Task '${inputStartTask.name}' successfully started`)
      .catch((error) => Promise.reject(`Failed to start Task with error '${error}'`))
  );
}

