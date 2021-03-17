/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { TektonItem } from './tektonitem';
import { window } from 'vscode';
import * as cliInstance from '../cli';
import { startTask } from './starttask';
import { Command } from '../util/command';
import { TektonNode } from '../tree-view/tekton-node';

export class Task extends TektonItem {

  static async start(task: TektonNode, commandId?: string): Promise<string> {
    if (!task) {
      task = await window.showQuickPick(await Task.getTaskNames(), { placeHolder: 'Select Task to start', ignoreFocusOut: true });
    }
    if (!task) return null;
    return await startTask(task.getName(), commandId);
  }

  static async list(): Promise<void> {
    Task.tkn.executeInTerminal(Command.listTasksInTerminal());
  }

  static getDeleteCommand(item: TektonNode): cliInstance.CliCommand {
    return Command.deleteTask(item.getName());
  }
}
