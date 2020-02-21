/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { TektonItem } from './tektonitem';
import { TektonNode, Command } from '../tkn';
import { window } from 'vscode';
import { Progress } from '../util/progress';

export class PipelineRun extends TektonItem {

  // TODO: keep track of CLI development for this implementation 
  // https://github.com/tektoncd/cli/issues/13 and https://github.com/tektoncd/cli/issues/12
  /*     static cancel(context: TektonNode): Promise<void> {
        throw new Error("Method not implemented.");
    } */

  /*     static async restart(pipelinerun: TektonNode): Promise<void> {
        const pipelinerun = await PipelineRun.getTektonCmdData(treeItem,
            "From which project you want to describe PipelineRun",
            "Select PipelineRun you want to describe");
        if (pipelinerun) { PipelineRun.tkn.executeInTerminal(Command.startPipeline(pipelinerun.getName(), undefined, undefined)); }
    } */

  static async describe(pipelinerun: TektonNode): Promise<void> {
    /*         const pipelinerun = await PipelineRun.getTektonCmdData(treeItem,
            "From which project you want to describe PipelineRun",
            "Select PipelineRun you want to describe"); */
    if (pipelinerun) { PipelineRun.tkn.executeInTerminal(Command.describePipelineRuns(pipelinerun.getName())); }
  }
    
  static async list(pipelinerun: TektonNode): Promise<void> {
    /*         const pipelinerun = await PipelineRun.getTektonCmdData(treeItem,
            "From which project you want to describe PipelineRun",
            "Select PipelineRun you want to describe"); */
    if (pipelinerun) { PipelineRun.tkn.executeInTerminal(Command.listPipelineRunsInTerminal(pipelinerun.getName())); }
  }

  static async logs(pipelinerun: TektonNode): Promise<void> {
    if (pipelinerun) { PipelineRun.tkn.executeInTerminal(Command.showPipelineRunLogs(pipelinerun.getName())); }
  }

  static async followLogs(pipelinerun: TektonNode): Promise<void> {
    PipelineRun.tkn.executeInTerminal(Command.showPipelineRunFollowLogs(pipelinerun.getName()));
  }

  static async cancel(pipelinerun: TektonNode): Promise<void> {
    if (pipelinerun) { PipelineRun.tkn.executeInTerminal(Command.cancelPipelineRun(pipelinerun.getName())); }
  }

  static async delete(pipelinerun: TektonNode): Promise<string> {
    const value = await window.showWarningMessage(`Do you want to delete the PipelineRun '${pipelinerun.getName()}'?`, 'Yes', 'Cancel');
    if (value === 'Yes') {
      return Progress.execFunctionWithProgress(`Deleting the PipelineRun '${pipelinerun.getName()}'.`, () => 
        PipelineRun.tkn.execute(Command.deletePipelineRun(pipelinerun.getName())))
        .then(() => `The PipelineRun '${pipelinerun.getName()}' successfully deleted.`)
        .catch((err) => Promise.reject(`Failed to delete the PipelineRun '${pipelinerun.getName()}': '${err}'.`));
    }
    return null;
  }

}
