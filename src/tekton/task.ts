/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { TektonItem } from './tektonitem';
import { TektonNode, Command } from '../tkn';

export class Task extends TektonItem {

    static async list(treeItem: TektonNode): Promise<void> {
        const task = await Task.getTektonCmdData(treeItem,
            "Which task do you want to list");
        if (task) Task.tkn.executeInTerminal(Command.listTasks(task.getName()));
    }

}