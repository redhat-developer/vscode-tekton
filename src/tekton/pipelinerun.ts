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
        .then(() => PipelineRun.explorer.refresh())
        .then(() => `The PipelineRun '${pipelinerun.getName()}' successfully deleted.`)
        .catch((err) => Promise.reject(`Failed to delete the PipelineRun '${pipelinerun.getName()}': '${err}'.`));
    }
    return null;
  }

}
