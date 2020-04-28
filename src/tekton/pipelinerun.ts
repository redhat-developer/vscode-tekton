/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { TektonItem } from './tektonitem';
import { TektonNode, Command } from '../tkn';
import { window } from 'vscode';
import { Progress } from '../util/progress';

export class PipelineRun extends TektonItem {

  static async describe(pipelinerun: TektonNode): Promise<void> {
    if (pipelinerun) { PipelineRun.tkn.executeInTerminal(Command.describePipelineRuns(pipelinerun.getName())); }
  }

  static async list(pipelinerun: TektonNode): Promise<void> {
    if (pipelinerun) { PipelineRun.tkn.executeInTerminal(Command.listPipelineRunsInTerminal(pipelinerun.getName())); }
  }

  static async logs(pipelineRun: TektonNode): Promise<void> {
    if (pipelineRun) { PipelineRun.tkn.executeInTerminal(Command.showPipelineRunLogs(pipelineRun.getName())); }
  }

  static async followLogs(pipelineRun: TektonNode): Promise<void> {
    PipelineRun.tkn.executeInTerminal(Command.showPipelineRunFollowLogs(pipelineRun.getName()));
  }

  static async cancel(pipelineRun: TektonNode): Promise<void> {
    if (pipelineRun) { PipelineRun.tkn.executeInTerminal(Command.cancelPipelineRun(pipelineRun.getName())); }
  }

  static async delete(pipelineRun: TektonNode): Promise<string> {
    if (!pipelineRun) return null;
    const value = await window.showWarningMessage(`Do you want to delete the PipelineRun '${pipelineRun.getName()}'?`, 'Yes', 'Cancel');
    if (value === 'Yes') {
      return Progress.execFunctionWithProgress(`Deleting the PipelineRun '${pipelineRun.getName()}'.`, () =>
        PipelineRun.tkn.execute(Command.deletePipelineRun(pipelineRun.getName())))
        .then(() => PipelineRun.explorer.refresh())
        .then(() => `The PipelineRun '${pipelineRun.getName()}' successfully deleted.`)
        .catch((err) => Promise.reject(`Failed to delete the PipelineRun '${pipelineRun.getName()}': '${err}'.`));
    }
    return null;
  }

}
