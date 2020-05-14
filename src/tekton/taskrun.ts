/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { TektonItem } from './tektonitem';
import { TektonNode, Command } from '../tkn';
import { window } from 'vscode';
import { Progress } from '../util/progress';

export class TaskRun extends TektonItem {

  static async listFromPipelineRun(pipelineRun: TektonNode): Promise<void> {
    if (pipelineRun) { 
      TaskRun.tkn.executeInTerminal(Command.listTaskRunsForPipelineRunInTerminal(pipelineRun.getName())); 
    }
  }

  static async listFromTask(taskRun: TektonNode): Promise<void> {
    if (taskRun) { TaskRun.tkn.executeInTerminal(Command.listTaskRunsForTasksInTerminal(taskRun.getName())); }
  }

  static async logs(taskRun: TektonNode): Promise<void> {
    if (taskRun) { TaskRun.tkn.executeInTerminal(Command.showTaskRunLogs(taskRun.getName())); }
  }

  static async followLogs(taskRun: TektonNode): Promise<void> {
    TaskRun.tkn.executeInTerminal(Command.showTaskRunFollowLogs(taskRun.getName()));
  }

  static async delete(taskRun: TektonNode): Promise<string> {
    if (!taskRun) return null;
    const value = await window.showWarningMessage(`Do you want to delete the TaskRun '${taskRun.getName()}'?`, 'Yes', 'Cancel');
    if (value === 'Yes') {
      return Progress.execFunctionWithProgress(`Deleting the TaskRun '${taskRun.getName()}'.`, () =>
        TaskRun.tkn.execute(Command.deleteTaskRun(taskRun.getName())))
        .then(() => TaskRun.explorer.refresh())
        .then(() => `The TaskRun '${taskRun.getName()}' successfully deleted.`)
        .catch((err) => Promise.reject(`Failed to delete the TaskRun '${taskRun.getName()}': '${err}'.`));
    }
    return null;
  }
}
