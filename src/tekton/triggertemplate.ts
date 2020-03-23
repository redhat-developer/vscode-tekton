/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/


import { TektonItem } from './tektonitem';
import { TektonNode, Command } from '../tkn';
import { window } from 'vscode';
import { Progress } from '../util/progress';

export class TriggerTemplate extends TektonItem {

  static async delete(triggerTemplate: TektonNode): Promise<string> {
    const value = await window.showWarningMessage(`Do you want to delete the TriggerTemplate '${triggerTemplate.getName()}'?`, 'Yes', 'Cancel');
    if (value === 'Yes') {
      return Progress.execFunctionWithProgress(`Deleting the TriggerTemplate '${triggerTemplate.getName()}'.`, () =>
        TriggerTemplate.tkn.execute(Command.deleteTriggerTemplate(triggerTemplate.getName())))
        .then(() => TriggerTemplate.explorer.refresh(triggerTemplate ? triggerTemplate.getParent() : undefined))
        .then(() => `The TriggerTemplate '${triggerTemplate.getName()}' successfully deleted.`)
        .catch((err) => Promise.reject(`Failed to delete the TriggerTemplate '${triggerTemplate.getName()}': '${err}'.`));
    }
    return null;
  }
}
