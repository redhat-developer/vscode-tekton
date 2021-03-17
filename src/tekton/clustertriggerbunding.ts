/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { TektonItem } from './tektonitem';
import { CliCommand } from '../cli';
import { Command } from '../util/command';
import { TektonNode } from '../tree-view/tekton-node';

export class ClusterTriggerBinding extends TektonItem {
  static getDeleteCommand(item: TektonNode): CliCommand {
    return Command.deleteClusterTriggerBinding(item.getName());
  }
}
