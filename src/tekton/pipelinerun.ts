/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { TektonItem } from './tektonitem';
import { window, ViewColumn, workspace } from 'vscode';
import { CliCommand } from '../cli';
import { showPipelineRunPreview } from '../pipeline/pipeline-preview';
import { pipelineRunData } from './restartpipelinerundata';
import { PipelineWizard } from '../pipeline/wizard';
import { showLogInEditor } from '../util/log-in-editor';
import { TektonNode } from '../tree-view/tekton-node';
import { Command } from '../cli-command';
import { startPipelineFromJson } from './start-pipeline-from-json';

export class PipelineRun extends TektonItem {

  static async restart(pipelineRun: TektonNode, commandId?: string): Promise<void> {
    if (pipelineRun) {
      const trigger = await pipelineRunData(pipelineRun);
      if (trigger) {
        if (commandId) trigger.commandId = commandId;
        if (trigger.pipelineRun.workspaces.length === 0 && trigger.pipelineRun.resources.length === 0 && trigger.pipelineRun.params.length === 0) {
          await startPipelineFromJson(trigger);
        } else {
          PipelineWizard.create({ trigger, resourceColumn: ViewColumn.Active }, ViewColumn.Active, 'Restart PipelineRun', trigger.PipelineRunName);
        }
      }
    }
  }

  static async describe(pipelineRun: TektonNode): Promise<void> {
    if (!pipelineRun) {
      pipelineRun = await window.showQuickPick(await PipelineRun.getPipelineRunNames(), { placeHolder: 'Select Pipeline Run to describe', ignoreFocusOut: true });
    }
    if (!pipelineRun) return null;
    PipelineRun.tkn.executeInTerminal(Command.describePipelineRuns(pipelineRun.getName()));
  }

  static async logs(pipelineRun: TektonNode): Promise<void> {
    if (!pipelineRun) {
      pipelineRun = await window.showQuickPick(await PipelineRun.getPipelineRunNames(), { placeHolder: 'Select Pipeline Run to see logs', ignoreFocusOut: true });
    }
    if (!pipelineRun) {
      return;
    }
    if (workspace.getConfiguration('vs-tekton').get('showLogInEditor')) {
      showLogInEditor(Command.showPipelineRunLogs(pipelineRun.getName()), `Log: ${pipelineRun.getName()}`);
    } else {
      PipelineRun.tkn.executeInTerminal(Command.showPipelineRunLogs(pipelineRun.getName()));
    }
  }

  static async followLogs(pipelineRun: TektonNode): Promise<void> {
    if (!pipelineRun) {
      pipelineRun = await window.showQuickPick(await PipelineRun.getPipelineRunNames(), { placeHolder: 'Select Pipeline Run to see logs', ignoreFocusOut: true });
    }
    if (!pipelineRun){
      return;
    }
    PipelineRun.pipelineRunFollowLogs(pipelineRun.getName());
  }

  static async pipelineRunFollowLogs(pipelineRunName: string): Promise<void> {
    if (workspace.getConfiguration('vs-tekton').get('showLogInEditor')) {
      showLogInEditor(Command.showPipelineRunFollowLogs(pipelineRunName), `Log: ${pipelineRunName}`);
    } else {
      PipelineRun.tkn.executeInTerminal(Command.showPipelineRunFollowLogs(pipelineRunName));
    }
  }

  static async cancel(pipelineRun: TektonNode): Promise<void> {
    if (!pipelineRun) {
      pipelineRun = await window.showQuickPick(await PipelineRun.getPipelineRunNames(), { placeHolder: 'Select Pipeline Run to cancel', ignoreFocusOut: true });
    }
    if (!pipelineRun) return null;
    PipelineRun.tkn.executeInTerminal(Command.cancelPipelineRun(pipelineRun.getName()));
  }

  static getDeleteCommand(item: TektonNode): CliCommand {
    return Command.deletePipelineRun(item.getName())
  }

  static async showDiagram(item: TektonNode): Promise<void> {
    if (!item) return null;
    await showPipelineRunPreview(item.getName(), item.uid);
  }
}
