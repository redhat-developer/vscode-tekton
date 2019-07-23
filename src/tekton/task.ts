/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { TektonItem } from './tektonitem';
import { TektonNode, Command } from '../tkn';
import * as k8s from 'vscode-kubernetes-tools-api';

export class Task extends TektonItem {

    static start(start: any, context: any): any {
        throw new Error("Method not implemented.");
    }

    static async list(treeItem: TektonNode): Promise<void> {
        const task = await Task.getTektonCmdData(treeItem,
            "Which task do you want to list");
        if (task) { Task.tkn.executeInTerminal(Command.listTasks(task.getName())); }
    }

    static async delete(treeItem: TektonNode): Promise<void> {
        const task = await Task.getTektonCmdData(treeItem,
            "Which Pipeline do you want to delete",
            "Select Pipeline you want to delete");
        if (task) { 
            const kubectl = await k8s.extension.kubectl.v1;
            if (kubectl.available) { await kubectl.api.invokeCommand('delete task '+task.getName()); }
        }
    }

}