/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { TektonItem } from './tektonitem';
import { window } from 'vscode';
import { CliCommand } from '../cli';
import { TektonNode } from '../tree-view/tekton-node';
import { Command } from '../cli-command';

export class PipelineResource extends TektonItem {

  static async describe(pipelineResource: TektonNode): Promise<void> {
    if (!pipelineResource) {
      pipelineResource = await window.showQuickPick(await PipelineResource.getPipelineResourceNames(), { placeHolder: 'Select Pipeline Resource to describe', ignoreFocusOut: true });
    }
    if (!pipelineResource) return null;
    PipelineResource.tkn.executeInTerminal(Command.describePipelineResource(pipelineResource.getName()));
  }

  static getDeleteCommand(item: TektonNode): CliCommand {
    return Command.deletePipelineResource(item.getName())
  }
}
