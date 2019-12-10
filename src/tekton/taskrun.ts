/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { TektonItem } from './tektonitem';
import { TektonNode, Command } from '../tkn';
import { window } from 'vscode';
import { Progress } from '../util/progress';

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

    static async followLogs(taskrun: TektonNode): Promise<void> {
        TaskRun.tkn.executeInTerminal(Command.showTaskRunFollowLogs(taskrun.getName()));
    }

    static async delete(taskrun: TektonNode): Promise<string> {
        const value = await window.showWarningMessage(`Do you want to delete the TaskRun '${taskrun.getName()}\'?`, 'Yes', 'Cancel');
        if (value === 'Yes') {
            return Progress.execFunctionWithProgress(`Deleting the TaskRun '${taskrun.getName()}'.`, () => 
                TaskRun.tkn.execute(Command.deleteTaskRun(taskrun.getName())))
                .then(() => `The TaskRun '${taskrun.getName()}' successfully deleted.`)
                .catch((err) => Promise.reject(`Failed to delete the TaskRun '${taskrun.getName()}': '${err}'.`));
        }
        return null;
    }
}