/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { ProviderResult, TreeItemCollapsibleState } from 'vscode';
import { ContextType } from '../context-type';
import { PipelineRunData } from '../tekton';
import format = require('string-format');
import { TektonNode, TektonNodeImpl } from './tekton-node';
import { compareTimeNewestFirst, Tkn } from '../tkn';
import { TaskRunFromPipeline } from './taskrun-for-pipeline-node';
import { humanizer } from '../util/humanizer';


export class PipelineRun extends TektonNodeImpl {
  private started: string;
  private finished: string;
  private item: PipelineRunData;
  private reason: string;
  constructor(parent: TektonNode,
    name: string,
    tkn: Tkn,
    item: PipelineRunData,
    collapsibleState: TreeItemCollapsibleState) {
    super(parent, name, (item?.status?.completionTime) ? ContextType.PIPELINERUNCHILDNODE : ContextType.PIPELINERUN, tkn, collapsibleState, item.metadata?.uid, item.metadata.creationTimestamp, item.status ? item.status.conditions[0].status : '');
    this.started = item.metadata.creationTimestamp;
    this.finished = item.status?.completionTime;
    this.reason = item.status?.conditions[0] ? `(${item.status?.conditions[0].reason})` : '';
    this.item = item;
  }

  get label(): string {
    return this.name;
  }

  get tooltip(): string {
    return format(`${this.CONTEXT_DATA[this.contextValue].tooltip} ${this.reason}`, this);
  }

  get description(): string {
    let r = '';
    if (this.finished) {
      r = `started ${humanizer(Date.now() - Date.parse(this.started))} ago, finished in ${humanizer(Date.parse(this.finished) - Date.parse(this.started))}`;
    } else {
      r = `running for ${humanizer(Date.now() - Date.parse(this.started))}`;
    }
    return r;
  }

  getChildren(): ProviderResult<TektonNode[]> {
    const result = [];
    const tasks = this.item.status?.taskRuns;
    if (!tasks) {
      return result;
    }
    for (const task in tasks) {
      const taskRun = tasks[task];
      result.push(new TaskRunFromPipeline(this, task, taskRun.pipelineTaskName, this.tkn, taskRun, this.uid));
    }

    return result.sort(compareTimeNewestFirst);
  }

  async refresh(): Promise<void> {
    const newItem = await this.tkn.getRawPipelineRun(this.item.metadata.name);
    if (newItem) {
      this.item = newItem;
    }
  }
}
