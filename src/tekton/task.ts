/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { TektonItem } from './tektonitem';
import { TektonNode, Command } from '../tkn';
import { window } from 'vscode';
import { Progress } from '../util/progress';

export class Task extends TektonItem {

  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
  static start(start: any, context: any): any {
    throw new Error('Method not implemented.');
  }

  static async list(task: TektonNode): Promise<void> {
    /*         const task = await Task.getTektonCmdData(treeItem,
            "Which task do you want to list"); */
    if (task) { Task.tkn.executeInTerminal(Command.listTasksinTerminal()); }
  }

  static async delete(task: TektonNode): Promise<string> {
    const value = await window.showWarningMessage(`Do you want to delete the Task '${task.getName()}'?`, 'Yes', 'Cancel');
    if (value === 'Yes') {
      return Progress.execFunctionWithProgress(`Deleting the Task '${task.getName()}'.`, () =>
        Task.tkn.execute(Command.deleteTask(task.getName())))
        .then(() => `The Task '${task.getName()}' successfully deleted.`)
        .catch((err) => Promise.reject(`Failed to delete the Task '${task.getName()}': '${err}'.`));
    }
    return null;
  }
}
