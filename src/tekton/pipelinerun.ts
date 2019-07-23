/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { TektonItem } from './tektonitem';
import { TektonNode, Command } from '../tkn';
import * as k8s from 'vscode-kubernetes-tools-api';

export class PipelineRun extends TektonItem {

    static cancel(context: TektonNode): Promise<void> {
        throw new Error("Method not implemented.");
    }

    static async restart(treeItem: TektonNode): Promise<void> {
        const pipelinerun = await PipelineRun.getTektonCmdData(treeItem,
            "From which project you want to describe PipelineRun",
            "Select PipelineRun you want to describe");
        if (pipelinerun) { PipelineRun.tkn.executeInTerminal(Command.startPipeline(pipelinerun.getName(), undefined, undefined)); }
    }

    static async describe(treeItem: TektonNode): Promise<void> {
        const pipelinerun = await PipelineRun.getTektonCmdData(treeItem,
            "From which project you want to describe PipelineRun",
            "Select PipelineRun you want to describe");
        if (pipelinerun) PipelineRun.tkn.executeInTerminal(Command.describePipelineRuns(pipelinerun.getName()));
    }
    
    static async list(treeItem: TektonNode): Promise<void> {
        const pipelinerun = await PipelineRun.getTektonCmdData(treeItem,
            "From which project you want to describe PipelineRun",
            "Select PipelineRun you want to describe");
        if (pipelinerun) PipelineRun.tkn.executeInTerminal(Command.listPipelineRuns(pipelinerun.getName()));
    }

    static async logs(treeItem: TektonNode): Promise<void> {
        const pipelinerun = await PipelineRun.getTektonCmdData(treeItem,
            "From which project you want to describe PipelineRun",
            "Select PipelineRun you want to describe");
        if (pipelinerun) PipelineRun.tkn.executeInTerminal(Command.showPipelineRunLogs(pipelinerun.getName()));
    }
    static async delete(treeItem: TektonNode): Promise<void> {
        const pipelinerun = await PipelineRun.getTektonCmdData(treeItem,
            "Which Pipeline do you want to delete",
            "Select Pipeline you want to delete");
        if (pipelinerun) { 
            const kubectl = await k8s.extension.kubectl.v1;
            if (kubectl.available) { await kubectl.api.invokeCommand('delete pipelinerun '+pipelinerun.getName()); }
        }
    }

}