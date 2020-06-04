/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { TektonItem } from './tektonitem';
import { TektonNode, Command } from '../tkn';
import { window } from 'vscode';
import { Progress } from '../util/progress';

export class PipelineRun extends TektonItem {

  static async describe(pipelineRun: TektonNode): Promise<void> {
    if (!pipelineRun) {
      pipelineRun = await window.showQuickPick(await PipelineRun.getPipelineRunNames(), {placeHolder: 'Select Pipeline Run to describe', ignoreFocusOut: true});
    }
    if (!pipelineRun) return null;
    PipelineRun.tkn.executeInTerminal(Command.describePipelineRuns(pipelineRun.getName()));
  }

  static async list(pipelineRun: TektonNode): Promise<void> {
    if (!pipelineRun) {
      pipelineRun = await window.showQuickPick(await PipelineRun.getPipelineRunNames(), {placeHolder: 'Select Pipeline Run to list', ignoreFocusOut: true});
    }
    if (!pipelineRun) return null;
    PipelineRun.tkn.executeInTerminal(Command.listPipelineRunsInTerminal(pipelineRun.getName()));
  }

  static async logs(pipelineRun: TektonNode): Promise<void> {
    if (!pipelineRun) {
      pipelineRun = await window.showQuickPick(await PipelineRun.getPipelineRunNames(), {placeHolder: 'Select Pipeline Run to see logs', ignoreFocusOut: true});
    }
    if (!pipelineRun) return null;
    PipelineRun.tkn.executeInTerminal(Command.showPipelineRunLogs(pipelineRun.getName()));
  }

  static async followLogs(pipelineRun: TektonNode): Promise<void> {
    if (!pipelineRun) {
      pipelineRun = await window.showQuickPick(await PipelineRun.getPipelineRunNames(), {placeHolder: 'Select Pipeline Run to see logs', ignoreFocusOut: true});
    }
    if (!pipelineRun) return null;
    PipelineRun.tkn.executeInTerminal(Command.showPipelineRunFollowLogs(pipelineRun.getName()));
  }

  static async cancel(pipelineRun: TektonNode): Promise<void> {
    if (!pipelineRun) {
      pipelineRun = await window.showQuickPick(await PipelineRun.getPipelineRunNames(), {placeHolder: 'Select Pipeline Run to cancel', ignoreFocusOut: true});
    }
    if (!pipelineRun) return null;
    PipelineRun.tkn.executeInTerminal(Command.cancelPipelineRun(pipelineRun.getName()));
  }

  static async delete(pipelineRun: TektonNode): Promise<string> {
    if (!pipelineRun) {
      pipelineRun = await window.showQuickPick(await PipelineRun.getPipelineRunNames(), {placeHolder: 'Select Pipeline Run to delete', ignoreFocusOut: true});
    }
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
