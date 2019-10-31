/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { TektonItem } from './tektonitem';
import { TektonNode, Command } from '../tkn';

export class ClusterTask extends TektonItem {

    static start(context: TektonNode): Promise<void> {
        throw new Error("Method not implemented.");
    }

    static async list(clustertasks: TektonNode): Promise<void> {
            if (clustertasks) { ClusterTask.tkn.executeInTerminal(Command.listClusterTasksinTerminal()); }
    }

    static async delete(clustertask: TektonNode): Promise<void> {
        if (clustertask) { ClusterTask.tkn.executeInTerminal(Command.deleteClusterTask(clustertask.getName())); }
    }

}