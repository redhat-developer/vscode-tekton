/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/


import { TektonItem } from './tektonitem';
import { TektonNode, Command } from '../tkn';
import { window } from 'vscode';
import { Progress } from '../util/progress';

export class Condition extends TektonItem {

  static async delete(condition: TektonNode): Promise<string> {
    if (!condition) {
      condition = await window.showQuickPick(await Condition.getConditionNames(), { placeHolder: 'Select Condition to delete', ignoreFocusOut: true });
    }
    if (!condition) return null;
    const value = await window.showWarningMessage(`Do you want to delete the Condition '${condition.getName()}'?`, 'Yes', 'Cancel');
    if (value === 'Yes') {
      return Progress.execFunctionWithProgress(`Deleting the Condition '${condition.getName()}'.`, () =>
        Condition.tkn.execute(Command.deleteCondition(condition.getName())))
        .then(() => Condition.explorer.refresh(condition ? condition.getParent() : undefined))
        .then(() => `The Condition '${condition.getName()}' successfully deleted.`)
        .catch((err) => Promise.reject(`Failed to delete the Condition '${condition.getName()}': '${err}'.`));
    }
    return null;
  }
}
