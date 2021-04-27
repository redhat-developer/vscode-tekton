/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import * as path from 'path';
import { TreeItemCollapsibleState, Uri } from 'vscode';
import { ContextType } from '../context-type';
import { ConditionCheckStatus, PipelineTaskRunData, TaskRunStatus } from '../tekton';
import { TektonNode, TektonNodeImpl } from './tekton-node';
import { getPipelineRunTaskState, Tkn } from '../tkn';
import { IMAGES, ERROR_PATH, PENDING_PATH } from '../icon-path';
import { humanizer } from '../humanizer';


export class TaskRun extends TektonNodeImpl {
  private started: string;
  private finished: string;
  constructor(parent: TektonNode,
    name: string,
    tkn: Tkn,
    item: PipelineTaskRunData) {
    super(parent, name, ContextType.TASKRUN, tkn, TreeItemCollapsibleState.None, item.metadata?.uid, item.metadata.creationTimestamp, item.status ? item.status.conditions[0].status : '');
    this.started = item.metadata.creationTimestamp;
    this.finished = item.status?.completionTime;
  }

  get label(): string {
    return this.name;
  }

  get description(): string {
    let r = '';
    if (this.getParent() && this.getParent().contextValue === ContextType.TASK) {
      if (this.finished) {
        r = 'started ' + humanizer(Date.now() - Date.parse(this.started)) + ' ago, finished in ' + humanizer(Date.parse(this.finished) - Date.parse(this.started));
      } else {
        r = 'started ' + humanizer(Date.now() - Date.parse(this.started)) + ' ago, running for ' + humanizer(Date.now() - Date.parse(this.started));
      }
    } else {
      if (this.finished) {
        r = 'finished in ' + humanizer(Date.parse(this.finished) - Date.parse(this.started));
      } else {
        r = 'running for ' + humanizer(Date.now() - Date.parse(this.started));
      }
    }
    return r;
  }
}

export abstract class BaseTaskRun extends TektonNodeImpl {
  constructor(parent: TektonNode,
    name: string,
    protected shortName: string,
    contextType: ContextType,
    tkn: Tkn,
    collapsibleState: TreeItemCollapsibleState,
    uid: string,
    creationTime: string,
    protected finished: string | undefined,
    status: TaskRunStatus | ConditionCheckStatus) {
    super(parent, name, contextType, tkn, collapsibleState, uid, creationTime, getPipelineRunTaskState(status));
  }

  get label(): string {
    return this.shortName ? this.shortName : this.name;
  }

  get description(): string {
    let r = '';
    if (this.getParent().contextValue === ContextType.TASK) {
      if (this.creationTime) {
        r = 'started ' + humanizer(Date.now() - Date.parse(this.creationTime)) + ' ago, finished in ' + humanizer(Date.parse(this.finished) - Date.parse(this.creationTime));
      } else {
        r = 'started ' + humanizer(Date.now() - Date.parse(this.creationTime)) + ' ago, running for ' + humanizer(Date.now() - Date.parse(this.creationTime));
      }
    } else {
      if (this.finished) {
        r = 'finished in ' + humanizer(Date.parse(this.finished) - Date.parse(this.creationTime));
      } else {
        r = 'running for ' + humanizer(Date.now() - Date.parse(this.creationTime));
      }
    }
    return r;
  }

  get iconPath(): Uri {
    if (this.state) {
      let filePath = IMAGES;
      if (this.state) {
        switch (this.state) {
          case 'Failed': {
            filePath = ERROR_PATH;
            break;
          }
          case 'Finished': {
            filePath = IMAGES;
            break;
          }
          case 'Cancelled':
            filePath = ERROR_PATH;
            break;

          case 'Started':
            return Uri.file(path.join(__dirname, IMAGES, 'running.gif'));

          case 'Unknown':
          default:
            filePath = PENDING_PATH;
            break;
        }
      }
      return Uri.file(path.join(__dirname, filePath, this.CONTEXT_DATA[this.contextValue].icon));
    }
    return super.iconPath;
  }
}
