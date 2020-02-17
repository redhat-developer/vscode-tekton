/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { TektonItem } from './tektonitem';
import { TektonNode, Command } from '../tkn';
import { Progress } from '../util/progress';
import { window } from 'vscode';

export class ClusterTask extends TektonItem {

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    static start(context: TektonNode): Promise<void> {
        throw new Error('Method not implemented.');
    }

    static async list(clustertasks: TektonNode): Promise<void> {
        if (clustertasks) { ClusterTask.tkn.executeInTerminal(Command.listClusterTasksinTerminal()); }
    }

    static async delete(clustertask: TektonNode): Promise<string> {
        const value = await window.showWarningMessage(`Do you want to delete the ClusterTask '${clustertask.getName()}'?`, 'Yes', 'Cancel');
        if (value === 'Yes') {
            return Progress.execFunctionWithProgress(`Deleting the ClusterTask '${clustertask.getName()}'.`, () => 
                ClusterTask.tkn.execute(Command.deleteClusterTask(clustertask.getName())))
                .then(() => `The ClusterTask '${clustertask.getName()}' successfully deleted.`)
                .catch((err) => Promise.reject(`Failed to delete the ClusterTask '${clustertask.getName()}': '${err}'.`));
        }
        return null;
    }

}
