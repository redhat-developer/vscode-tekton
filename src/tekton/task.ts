/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { TektonItem } from './tektonitem';
import { window } from 'vscode';
import * as cliInstance from '../cli';
import { createWizardForTaskOrClusterTask } from './create-wizard-for-task-or-clustertask';
import { TektonNode } from '../tree-view/tekton-node';
import { Command } from '../cli-command';
import { TaskModel } from '../util/resource-kind';


export class Task extends TektonItem {

  static async start(task: TektonNode, commandId?: string): Promise<string> {
    if (!task) {
      task = await window.showQuickPick(await Task.getTaskNames(), { placeHolder: 'Select Task to start', ignoreFocusOut: true });
    }
    if (!task) return null;
    return await createWizardForTaskOrClusterTask(task.getName(), TaskModel.kind ,commandId);
  }

  static getDeleteCommand(item: TektonNode): cliInstance.CliCommand {
    return Command.deleteTask(item.getName());
  }
}
