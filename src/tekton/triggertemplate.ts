/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { TektonItem } from './tektonitem';
import { TektonNode, Command, tkn } from '../tkn';
import { CliCommand } from '../cli';
import { getExposeURl } from '../util/exposeurl';

export class TriggerTemplate extends TektonItem {

  static getDeleteCommand(item: TektonNode): CliCommand {
    return Command.deleteTriggerTemplate(item.getName());
  }

  static async copyExposeUrl(trigger: TektonNode): Promise<string> {
    if (!trigger) return null;
    const result = await tkn.execute(Command.listEventListener());
    const listEventListener = JSON.parse(result.stdout).items;
    if (listEventListener.length === 0) {
      vscode.window.showInformationMessage('Expose URl not available');
      return null;
    }
    for (const eventListener of listEventListener) {
      for (const triggers of eventListener.spec.triggers) {
        if (triggers?.template?.name === trigger.getName()) {
          const url = await getExposeURl(eventListener.status.configuration.generatedName);
          vscode.env.clipboard.writeText(url);
          vscode.window.showInformationMessage('Expose URl successfully copied');
          return;
        } else if (triggers?.triggerRef) {
          const triggerData = await tkn.execute(Command.getTrigger(triggers.triggerRef));
          const triggerName = JSON.parse(triggerData.stdout).spec.template.name;
          if (triggerName === trigger.getName()) {
            const url = await getExposeURl(eventListener.status.configuration.generatedName);
            vscode.env.clipboard.writeText(url);
            vscode.window.showInformationMessage('Expose URl successfully copied');
            return;
          }
        }
      }
    }
    vscode.window.showInformationMessage('Expose URl not available');
  }
}
