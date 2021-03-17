/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { TektonItem } from './tektonitem';
import { tkn } from '../tkn';
import { CliCommand } from '../cli';
import { getExposeURl } from '../util/exposeurl';
import { telemetryLogCommand } from '../telemetry';
import { Command } from '../util/command';
import { TektonNode } from '../tree-view/tekton-node';

export class TriggerTemplate extends TektonItem {

  static getDeleteCommand(item: TektonNode): CliCommand {
    return Command.deleteTriggerTemplate(item.getName());
  }

  static async copyExposeUrl(trigger: TektonNode, commandId?: string): Promise<string> {
    if (!trigger) return null;
    const result = await tkn.execute(Command.listEventListener());
    const message = 'Expose URL not available';
    const listEventListener = JSON.parse(result.stdout).items;
    if (listEventListener.length === 0) {
      telemetryLogCommand(commandId, message);
      vscode.window.showInformationMessage(message);
      return null;
    }
    for (const eventListener of listEventListener) {
      for (const triggers of eventListener.spec.triggers) {
        const message = 'Expose URL successfully copied';
        if (triggers?.template?.name === trigger.getName()) {
          const url = await getExposeURl(eventListener.status.configuration.generatedName);
          vscode.env.clipboard.writeText(url);
          telemetryLogCommand(commandId, message);
          vscode.window.showInformationMessage(message);
          return;
        } else if (triggers?.triggerRef) {
          const triggerData = await tkn.execute(Command.getTrigger(triggers.triggerRef));
          const triggerName = JSON.parse(triggerData.stdout).spec.template.name;
          if (triggerName === trigger.getName()) {
            const url = await getExposeURl(eventListener.status.configuration.generatedName);
            vscode.env.clipboard.writeText(url);
            telemetryLogCommand(commandId, message);
            vscode.window.showInformationMessage(message);
            return;
          }
        }
      }
    }
    telemetryLogCommand(commandId, message);
    vscode.window.showInformationMessage('Expose URl not available');
  }
}
