/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { TektonItem } from './tektonitem';
import { TektonNode, Command } from '../tkn';
import * as k8s from 'vscode-kubernetes-tools-api';

export class TaskRun extends TektonItem {
    static cancel(cancel: any, context: any): any {
        throw new Error("Method not implemented.");
    }

    static async list(taskrun: TektonNode): Promise<void> {
/*         const taskrun = await TaskRun.getTektonCmdData(treeItem,
            "From which pipeline do you want to list a Taskrun",
            "Select Taskruns you want to list"); */
        if (taskrun) { TaskRun.tkn.executeInTerminal(Command.listTaskRunsInTerminal("default")); }
    }

    static async logs(taskrun: TektonNode): Promise<void> {
/*         const taskrun = await TaskRun.getTektonCmdData(treeItem,
            "From which pipeline do you want to list a Taskrun",
            "Select Taskruns you want to list"); */
        if (taskrun) { TaskRun.tkn.executeInTerminal(Command.showTaskRunLogs(taskrun.getName())); }
    }

    static async delete(taskrun: TektonNode): Promise<void> {
/*         const taskrun= await TaskRun.getTektonCmdData(treeItem,
            "Which Pipeline do you want to delete",
            "Select Pipeline you want to delete"); */
        if (taskrun) { 
            const kubectl = await k8s.extension.kubectl.v1;
            if (kubectl.available) { await kubectl.api.invokeCommand('delete taskrun '+taskrun.getName()); }
        }
    }

}