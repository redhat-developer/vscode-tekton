/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { ProviderResult, TreeItemCollapsibleState } from 'vscode';
import { ContextType } from '../context-type';
import { TaskRun } from '../tekton';
import { TektonNode } from './tekton-node';
import { compareTimeNewestFirst, Tkn } from '../tkn';
import { BaseTaskRun } from './task-run-node';
import { ConditionRun } from './conditon-node';

export class TaskRunFromPipeline extends BaseTaskRun {
  constructor(parent: TektonNode, name: string, shortName: string, tkn: Tkn, private rawTaskRun: TaskRun, uid: string) {
    super(parent,
      name,
      shortName,
      ContextType.TASKRUN,
      tkn,
      rawTaskRun.conditionChecks ? TreeItemCollapsibleState.Collapsed : TreeItemCollapsibleState.None,
      uid,
      rawTaskRun.status?.startTime,
      rawTaskRun.status?.completionTime,
      rawTaskRun.status);
  }

  getChildren(): ProviderResult<TektonNode[]> {
    if (this.rawTaskRun.conditionChecks) {
      const result = []
      for (const conditionName in this.rawTaskRun.conditionChecks) {
        const rawCondition = this.rawTaskRun.conditionChecks[conditionName];
        result.push(new ConditionRun(this, conditionName, rawCondition.conditionName, this.tkn, rawCondition, this.uid));
      }
      return result.sort(compareTimeNewestFirst);
    } else {
      return super.getChildren();
    }
  }
}
