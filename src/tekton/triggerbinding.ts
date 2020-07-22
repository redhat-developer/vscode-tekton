/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/


import { TektonItem } from './tektonitem';
import { TektonNode, Command } from '../tkn';
import { CliCommand } from '../cli';

export class TriggerBinding extends TektonItem {

  static getDeleteCommand(item: TektonNode): CliCommand {
    return Command.deleteTriggerBinding(item.getName())
  }
}
