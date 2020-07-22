/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/


import { TektonItem } from './tektonitem';
import { TektonNode, Command } from '../tkn';
import { CliCommand } from '../cli';

export class Condition extends TektonItem {

  static getDeleteCommand(condition: TektonNode): CliCommand {
    return Command.deleteCondition(condition.getName());
  }
}
