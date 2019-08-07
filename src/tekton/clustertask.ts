/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { TektonItem } from './tektonitem';
import { TektonNode, Command } from '../tkn';
import * as k8s from 'vscode-kubernetes-tools-api';

export class ClusterTask extends TektonItem {

    static start(context: TektonNode): Promise<void> {
        throw new Error("Method not implemented.");
    }

    static async list(clustertasks: TektonNode): Promise<void> {
/*         const clustertasks = await ClusterTask.getTektonCmdData(treeItem,
            "From which pipeline you want to list ClusterTasks",
            "Select Pipeline you want to describe"); */
            if (clustertasks) { ClusterTask.tkn.executeInTerminal(Command.listClusterTasksinTerminal(clustertasks.getName())); }
    }

    static async delete(clustertask: TektonNode): Promise<void> {
/*         const clustertask = await ClusterTask.getTektonCmdData(treeItem,
            "Which ClusterTask do you want to delete",
            "Select ClusterTask you want to delete"); */
        if (clustertask) { 
            const kubectl = await k8s.extension.kubectl.v1;
            if (kubectl.available) { await kubectl.api.invokeCommand('delete clustertask '+clustertask.getName()); }
        }
    }

}