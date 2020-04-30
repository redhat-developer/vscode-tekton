/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { TektonItem, Trigger } from './tektonitem';
import { TektonNode, Command } from '../tkn';
import { window } from 'vscode';
import { Progress } from '../util/progress';
import * as cliInstance from '../cli';
import { TknPipelineTrigger } from '../tekton';

export class Task extends TektonItem {

  static async start(pipeline: TektonNode): Promise<string> {
    if (pipeline) {
      const result: cliInstance.CliExitData = await Task.tkn.execute(Command.listTasks(), process.cwd(), false);
      let data: TknPipelineTrigger[] = [];
      if (result.error) {
        console.log(result + ' Std.err when processing pipelines');
      }
      try {
        data = JSON.parse(result.stdout).items;
      } catch (ignore) {
        //show no pipelines if output is not correct json
      }

      const taskTrigger = data.map<Trigger>(value => ({
        name: value.metadata.name,
        resources: value.spec.resources,
        params: value.spec.params ? value.spec.params : undefined,
        serviceAcct: value.spec.serviceAccount ? value.spec.serviceAccount : undefined
      })).filter(function (obj) {
        return obj.name === pipeline.getName();
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
      const inputStartTask = await Task.startObject(taskTrigger, 'Task');

      return Progress.execFunctionWithProgress(`Starting Pipeline '${inputStartTask.name}'.`, () =>
        Task.tkn.startTask(inputStartTask)
          .then(() => Task.explorer.refresh())
          .then(() => `Task '${inputStartTask.name}' successfully started`)
          .catch((error) => Promise.reject(`Failed to start Task with error '${error}'`))
      );
    }
    return null;
  }

  static async list(task: TektonNode): Promise<void> {
    if (task) { Task.tkn.executeInTerminal(Command.listTasksInTerminal()); }
  }

  static async delete(task: TektonNode): Promise<string> {
    if (!task) return null;
    const value = await window.showWarningMessage(`Do you want to delete the Task '${task.getName()}'?`, 'Yes', 'Cancel');
    if (value === 'Yes') {
      return Progress.execFunctionWithProgress(`Deleting the Task '${task.getName()}'.`, () =>
        Task.tkn.execute(Command.deleteTask(task.getName())))
        .then(() => Task.explorer.refresh(task ? task.getParent() : undefined))
        .then(() => `The Task '${task.getName()}' successfully deleted.`)
        .catch((err) => Promise.reject(`Failed to delete the Task '${task.getName()}': '${err}'.`));
    }
    return null;
  }
}
