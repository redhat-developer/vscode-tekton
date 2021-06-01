/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { TektonItem } from './tektonitem';
import { CliCommand } from '../cli';
import { TektonNode } from '../tree-view/tekton-node';
import { Command } from '../cli-command';
import { createWizardForTask } from './start-task-or-clustertask';
import { ClusterTaskModel } from '../util/resource-kind';

export class ClusterTask extends TektonItem {

  static async start(clusterTask: TektonNode, commandId?: string): Promise<string> {
    if (!clusterTask) return null;
    return await createWizardForTask(clusterTask.getName(), ClusterTaskModel.kind, commandId);
  }

  static async list(): Promise<void> {
    ClusterTask.tkn.executeInTerminal(Command.listClusterTasksInTerminal());
  }

  static getDeleteCommand(item: TektonNode): CliCommand {
    return Command.deleteClusterTask(item.getName());
  }
}
