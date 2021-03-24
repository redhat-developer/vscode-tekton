/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { cli } from '../cli';
import { Command } from '../cli-command';
import { ContextType } from '../context-type';
import { PipelineTaskRunData } from '../tekton';
import { TektonNode } from '../tree-view/tekton-node';
import * as vscode from 'vscode';

export async function getTaskRunList(): Promise<PipelineTaskRunData[]> {
  const result = await cli.execute(Command.listTaskRun());
  if (result.error) {
    // ignore
  }
  let data: PipelineTaskRunData[] = [];
  try {
    const r = JSON.parse(result.stdout);
    data = r.items ? r.items : data;
  } catch (ignore) {
    // ignore
  }
  return data;
}
  
export function referenceOfTaskAndClusterTaskInCluster(item: TektonNode, taskRunList: PipelineTaskRunData[]): boolean{
  if (taskRunList.length !== 0 && (item.contextValue === ContextType.TASK || item.contextValue === ContextType.CLUSTERTASK)) {
    const found = taskRunList.some((value) => {
      if (value.spec.taskRef.name === item.getName()) {
        return true;
      }
    });
    return found;
  }
}
  
export function checkRefResource(): boolean {
  return vscode.workspace
    .getConfiguration('vs-tekton')
    .get<boolean>('refResource');
}
