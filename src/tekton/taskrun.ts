/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { TektonItem } from './tektonitem';
import { TektonNode, Command } from '../tkn';

export class TaskRun extends TektonItem {

    static async list(taskrun: TektonNode): Promise<void> {
        if (taskrun) { TaskRun.tkn.executeInTerminal(Command.listTaskRunsInTerminal()); }
    }

    static async listFromTask(taskrun: TektonNode): Promise<void> {
        if (taskrun) { TaskRun.tkn.executeInTerminal(Command.listTaskRunsforTasksinTerminal(taskrun.getName())); }
    }

    static async logs(taskrun: TektonNode): Promise<void> {
        if (taskrun) { TaskRun.tkn.executeInTerminal(Command.showTaskRunLogs(taskrun.getName())); }
    }

    static async delete(taskrun: TektonNode): Promise<void> {
        if (taskrun) { TaskRun.tkn.executeInTerminal(Command.deleteTaskRun(taskrun.getName())); }
    }
}