/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { TektonItem } from './tektonitem';
import { TektonNode, Command } from '../tkn';

export class TaskRun extends TektonItem {

    static async list(treeItem: TektonNode): Promise<void> {
        const taskrun = await TaskRun.getTektonCmdData(treeItem,
            "From which pipeline do you want to list a Taskrun",
            "Select Taskruns you want to list");
        if (taskrun) TaskRun.tkn.executeInTerminal(Command.listTaskRuns(taskrun.getName()));
    }

    static async logs(treeItem: TektonNode): Promise<void> {
        const taskrun = await TaskRun.getTektonCmdData(treeItem,
            "From which pipeline do you want to list a Taskrun",
            "Select Taskruns you want to list");
        if (taskrun) TaskRun.tkn.executeInTerminal(Command.showTaskRunLogs(taskrun.getName()));
    }

}