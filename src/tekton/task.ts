/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { TektonItem } from './tektonitem';
import { TektonNode, Command } from '../tkn';
import { window } from 'vscode';
import { Progress } from '../util/progress';
import * as cliInstance from '../cli';
import { TknPipelineTrigger } from '../tekton';
import { Trigger, PipelineContent } from './pipelinecontent';

export class Task extends TektonItem {

  static async start(task: TektonNode): Promise<string> {
    if (!task) {
      task = await window.showQuickPick(await Task.getTaskNames(), { placeHolder: 'Select Task to start', ignoreFocusOut: true });
    }
    if (!task) return null;
    const result: cliInstance.CliExitData = await Task.tkn.execute(Command.listTasks(), process.cwd(), false);
    let data: TknPipelineTrigger[] = [];
    if (result.error) {
      console.log(result + ' Std.err when processing task');
    }
    try {
      data = JSON.parse(result.stdout).items;
    } catch (ignore) {
      // ignore
    }

    const taskTrigger = data.map<Trigger>(value => ({
      name: value.metadata.name,
      resources: value.spec.resources,
      params: value.spec.params ? value.spec.params : undefined,
      serviceAcct: value.spec.serviceAccount ? value.spec.serviceAccount : undefined
    })).filter(function (obj) {
      return obj.name === task.getName();
    });
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
      Task.tkn.startTask(inputStartTask)
        .then(() => Task.explorer.refresh())
        .then(() => `Task '${inputStartTask.name}' successfully started`)
        .catch((error) => Promise.reject(`Failed to start Task with error '${error}'`))
    );
  }

  static async list(): Promise<void> {
    Task.tkn.executeInTerminal(Command.listTasksInTerminal());
  }

  static getDeleteCommand(item: TektonNode): cliInstance.CliCommand {
    return Command.deleteTask(item.getName());
  }
}
