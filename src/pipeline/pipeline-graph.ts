/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { getTektonDocuments, TektonYamlType, getMetadataName, getPipelineTasks, DeclaredTask } from '../yaml-support/tkn-yaml';
import { YamlDocument } from '../yaml-support/yaml-locator';
export interface BaseData {
  id: string;
}

export interface NodeData extends BaseData {
  name: string;
  type?: string;
}

export interface EdgeData extends BaseData {
  source: string;
  target: string;
}

export interface NodeOrEdge {
  data: EdgeData | NodeData;
}

export async function calculatePipelineGraph(document: vscode.TextDocument): Promise<NodeOrEdge[]> {
  const pipeDocs = getTektonDocuments(document, TektonYamlType.Pipeline);
  if (pipeDocs === undefined) {
    return []; // TODO: we cannot find any Pipeline yaml, throw error there!
  }
  let doc: YamlDocument;
  if (pipeDocs.length > 1) {
    doc = await askToSelectPipeline(pipeDocs);
    if (doc === undefined) {
      return []; // TODO: we cannot find any Pipeline yaml, throw error there!
    }
  } else {
    doc = pipeDocs[0];
  }

  const tasks = getPipelineTasks(doc);

  return convertTasksToNode(tasks);
}

async function askToSelectPipeline(pipeDocs: YamlDocument[]): Promise<YamlDocument | undefined> {
  const map = new Map<string, YamlDocument>();
  pipeDocs.forEach(doc => map.set(getMetadataName(doc), doc));
  const name = await vscode.window.showQuickPick(Array.from(map.keys()), { placeHolder: 'Your file contains more then one Pipeline, please select one', ignoreFocusOut: true });
  return map.get(name);
}

function convertTasksToNode(tasks: DeclaredTask[]): NodeOrEdge[] {
  const result: NodeOrEdge[] = [];
  const tasksIndex = tasks.map(task => task.name);

  for (const task of tasks) {
    result.push({ data: { id: task.name, name: task.name, type: task.kind, taskRef: task.taskRef } as NodeData });
    for (const after of task.runAfter) {
      if (tasksIndex.includes(after)) {
        result.push({ data: { source: after, target: task.name, id: `${after}-${task.name}` } as EdgeData });
      }
    }
  }

  return result;
}
