/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { TektonItem } from './tektonitem';
import { Command, TektonNode } from '../tkn';
import { Progress } from '../util/progress';
import { window } from 'vscode';

export class EventListener extends TektonItem {

  static async delete(eventListener: TektonNode): Promise<string> {
    if (!eventListener) {
      eventListener = await window.showQuickPick(EventListener.getEventListenerNames(), {placeHolder: 'Select EventListener to delete', ignoreFocusOut: true});
    }
    if (!eventListener) return null;
    const value = await window.showWarningMessage(`Do you want to delete the EventListener '${eventListener.getName()}'?`, 'Yes', 'Cancel');
    if (value === 'Yes') {
      return Progress.execFunctionWithProgress(`Deleting the EventListener '${eventListener.getName()}'.`, () =>
        EventListener.tkn.execute(Command.deleteEventListeners(eventListener.getName())))
        .then(() => EventListener.explorer.refresh(eventListener.getParent() ? eventListener.getParent() : undefined))
        .then(() => `The EventListener '${eventListener.getName()}' successfully deleted.`)
        .catch((err) => Promise.reject(`Failed to delete the EventListener '${eventListener.getName()}': '${err}'.`));
    }
    return null;
  }
}
