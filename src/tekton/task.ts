/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { TektonItem } from './tektonitem';
import { TektonNode, Command } from '../tkn';

export class Task extends TektonItem {

    static start(start: any, context: any): any {
        throw new Error("Method not implemented.");
    }

    static async list(task: TektonNode): Promise<void> {
/*         const task = await Task.getTektonCmdData(treeItem,
            "Which task do you want to list"); */
        if (task) { Task.tkn.executeInTerminal(Command.listTasksinTerminal("default")); }
    }

    static async delete(task: TektonNode): Promise<void> {
        if (task) { Task.tkn.executeInTerminal(Command.deleteTask(task.getName())); }
    }
}