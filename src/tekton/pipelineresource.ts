/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { TektonItem } from './tektonitem';
import { TektonNode, Command } from '../tkn';
import { Progress } from '../util/progress';
import { window } from 'vscode';
import { CliCommand } from '../cli';
import sendTelemetry, { TelemetryProperties, telemetryProperties } from '../telemetry';

export class PipelineResource extends TektonItem {

  static async create(context: TektonNode, commandId?: string): Promise<string> {
    const telemetryProps: TelemetryProperties = telemetryProperties(commandId);
    const document = window.activeTextEditor ? window.activeTextEditor.document : undefined;
    const pleaseSave = 'Please save your changes before executing \'Tekton: Create\' command.';
    let message: string;

    if (!document || !document.fileName.endsWith('.yaml')) {
      message = '\'Tekton: Create\' command requires .yaml file opened in editor.';
    }

    if (!message && document.isUntitled) {
      message = pleaseSave;
    }

    if (!message && document.isDirty) {
      const save = 'Save';
      const action = await window.showInformationMessage('Editor has unsaved changes.', save);
      if (action !== save) {
        message = pleaseSave;
      } else {
        await document.save();
      }
    }

    if (message) {
      window.showWarningMessage(message);
    } else {
      return Progress.execFunctionWithProgress('Creating PipelineResource', () =>
        PipelineResource.tkn.execute(Command.createPipelineResource(document.fileName)))
        .then(() => PipelineResource.explorer.refresh(context ? context : undefined))
        .then(() => {
          const message = 'PipelineResources were successfully created.';
          if (commandId) {
            telemetryProps['message'] = message;
            sendTelemetry(commandId, telemetryProps);
          }
          return window.showInformationMessage(message);
        })
        .catch((err) => {
          return Promise.reject(`Failed to Create PipelineResources with error: ${err}`)
        });
    }
  }

  static async describe(pipelineResource: TektonNode): Promise<void> {
    if (!pipelineResource) {
      pipelineResource = await window.showQuickPick(await PipelineResource.getPipelineResourceNames(), { placeHolder: 'Select Pipeline Resource to describe', ignoreFocusOut: true });
    }
    if (!pipelineResource) return null;
    PipelineResource.tkn.executeInTerminal(Command.describePipelineResource(pipelineResource.getName()));
  }

  static async list(pipelineResource: TektonNode): Promise<void> {
    if (!pipelineResource) {
      pipelineResource = await window.showQuickPick(await PipelineResource.getPipelineResourceNames(), { placeHolder: 'Select Pipeline Resource to list', ignoreFocusOut: true });
    }
    if (!pipelineResource) return null;
    PipelineResource.tkn.executeInTerminal(Command.listPipelineResourcesInTerminal(pipelineResource.getName()));
  }

  static getDeleteCommand(item: TektonNode): CliCommand {
    return Command.deletePipelineResource(item.getName())
  }
}
