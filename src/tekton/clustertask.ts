/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { TektonItem } from './tektonitem';
import { TektonNode, Command } from '../tkn';

export class ClusterTask extends TektonItem {

    static async list(treeItem: TektonNode): Promise<void> {
        const clustertasks = await ClusterTask.getTektonCmdData(treeItem,
            "From which pipeline you want to list ClusterTasks",
            "Select Pipeline you want to describe");
        if (clustertasks) { ClusterTask.tkn.executeInTerminal(Command.listClusterTasks(clustertasks.getName())); }
    }

}