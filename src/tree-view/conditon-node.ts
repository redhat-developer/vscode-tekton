/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { TreeItemCollapsibleState } from 'vscode';
import { ContextType } from '../context-type';
import { BaseTaskRun } from './task-run-node';
import { PipelineRunConditionCheckStatus } from '../tekton';
import { TektonNode } from './tekton-node';
import { Tkn } from '../tkn';



export class ConditionRun extends BaseTaskRun {
  constructor(parent: TektonNode, name: string, shortName: string, tkn: Tkn, item: PipelineRunConditionCheckStatus, uid: string) {
    super(parent, name, shortName, ContextType.CONDITIONTASKRUN, tkn, TreeItemCollapsibleState.None, uid, item.status?.startTime, item.status?.completionTime, item.status)
  }
}
