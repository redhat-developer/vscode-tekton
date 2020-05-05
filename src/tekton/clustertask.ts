/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { TektonItem } from './tektonitem';
import { TektonNode, Command } from '../tkn';
import { Progress } from '../util/progress';
import { window } from 'vscode';

export class ClusterTask extends TektonItem {

  static async list(clusterTasks: TektonNode): Promise<void> {
    if (clusterTasks) { ClusterTask.tkn.executeInTerminal(Command.listClusterTasksInTerminal()); }
  }

  static async delete(clusterTask: TektonNode): Promise<string> {
    if (!clusterTask) return null;
    const value = await window.showWarningMessage(`Do you want to delete the ClusterTask '${clusterTask.getName()}'?`, 'Yes', 'Cancel');
    if (value === 'Yes') {
      return Progress.execFunctionWithProgress(`Deleting the ClusterTask '${clusterTask.getName()}'.`, () =>
        ClusterTask.tkn.execute(Command.deleteClusterTask(clusterTask.getName())))
        .then(() => ClusterTask.explorer.refresh(clusterTask ? clusterTask.getParent() : undefined))
        .then(() => `The ClusterTask '${clusterTask.getName()}' successfully deleted.`)
        .catch((err) => Promise.reject(`Failed to delete the ClusterTask '${clusterTask.getName()}': '${err}'.`));
    }
    return null;
  }

}
