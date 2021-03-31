/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { cli } from '../cli';
import { Command } from '../cli-command';
import { Pipeline } from '../tekton';
import { TektonNode } from '../tree-view/tekton-node';
import * as vscode from 'vscode';

const tektonResource = {
  task: 'Task',
  clustertask: 'ClusterTask'
}


export async function getPipelineList(): Promise<Pipeline[]> {
  const result = await cli.execute(Command.listPipeline());
  let data: Pipeline[] = [];
  try {
    const r = JSON.parse(result.stdout);
    data = r.items ? r.items : data;
  } catch (ignore) {
    // ignore
  }
  return data;
}

export function referenceOfTaskAndClusterTaskInCluster(item: TektonNode, pipelineList: Pipeline[]): boolean {
  const found = pipelineList.some((value) => {
    if (value?.spec?.tasks) {
      return value?.spec?.tasks.some((task) => {
        if (task?.taskRef?.kind === tektonResource[item.contextValue] && task?.taskRef?.name === item.getName()) {
          return true;
        }
      })
    }
  });
  return found;
}

export function checkRefResource(): boolean {
  return vscode.workspace
    .getConfiguration('vs-tekton')
    .get<boolean>('refResource');
}
