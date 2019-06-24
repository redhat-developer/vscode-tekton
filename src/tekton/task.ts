/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { TektonItem } from './tektonitem';
import { TektonNode, Command } from '../tkn';

export class Task extends TektonItem {

    static async list(treeItem: TektonNode): Promise<void> {
        const tasks = await Task.getTektonCmdData(treeItem,
            "From which pipeline you want to list Tasks",
            "Select Pipeline you want to describe");
        if (tasks) Task.tkn.executeInTerminal(Command.listTasks(tasks.getName()));
    }

}