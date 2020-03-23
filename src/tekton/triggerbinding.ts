/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/


import { TektonItem } from './tektonitem';
import { TektonNode, Command } from '../tkn';
import { window } from 'vscode';
import { Progress } from '../util/progress';

export class TriggerBinding extends TektonItem {

  static async delete(triggerBinding: TektonNode): Promise<string> {
    const value = await window.showWarningMessage(`Do you want to delete the TriggerBinding '${triggerBinding.getName()}'?`, 'Yes', 'Cancel');
    if (value === 'Yes') {
      return Progress.execFunctionWithProgress(`Deleting the TriggerBinding '${triggerBinding.getName()}'.`, () =>
        TriggerBinding.tkn.execute(Command.deleteTriggerBinding(triggerBinding.getName())))
        .then(() => TriggerBinding.explorer.refresh(triggerBinding ? triggerBinding.getParent() : undefined))
        .then(() => `The TriggerBinding '${triggerBinding.getName()}' successfully deleted.`)
        .catch((err) => Promise.reject(`Failed to delete the TriggerBinding '${triggerBinding.getName()}': '${err}'.`));
    }
    return null;
  }

}  