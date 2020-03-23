/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { getTektonDocuments, TektonYamlType, getMetadataName, getPipelineTasks, DeclaredTask, getTektonPipelineRefOrSpec } from '../yaml-support/tkn-yaml';
import { YamlDocument, VirtualDocument } from '../yaml-support/yaml-locator';
import { ContextType } from '../tkn';
import { kubefsUri, resourceDocProvider } from '../util/tektonresources.virtualfs';
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

export type GraphProvider = (document: vscode.TextDocument) => Promise<NodeOrEdge[]>;

export async function calculatePipelineGraph(document: vscode.TextDocument): Promise<NodeOrEdge[]> {

  const doc: YamlDocument = await getPipelineDocument(document, TektonYamlType.Pipeline);
  if (!doc) {
    return []; // TODO: throw error there
  }

  const tasks = getPipelineTasks(doc);

  return convertTasksToNode(tasks);
}

export async function calculatePipelineRunGraph(document: vscode.TextDocument): Promise<NodeOrEdge[]> {
  const doc: YamlDocument = await getPipelineDocument(document, TektonYamlType.PipelineRun);
  if (!doc) {
    return []; // TODO: throw error there
  }

  const refOrSpec = getTektonPipelineRefOrSpec(doc);
  if (typeof refOrSpec === 'string') {
    // get ref pipeline definition
    const uri = kubefsUri(`${ContextType.PIPELINE}/${refOrSpec}`, 'yaml');
    const pipelineDoc = await resourceDocProvider.loadTektonDocument(uri);
    const pipeDoc = await getPipelineDocument(pipelineDoc, TektonYamlType.Pipeline);
    const tasks = getPipelineTasks(pipeDoc);
    return convertTasksToNode(tasks);

  } else if (Array.isArray(refOrSpec)) {
    return convertTasksToNode(refOrSpec);
  } else {
    return [];
  }


}

async function getPipelineDocument(document: VirtualDocument, type: TektonYamlType): Promise<YamlDocument | undefined> {
  const pipeDocs = getTektonDocuments(document, type);
  if (pipeDocs === undefined) {
    return undefined;
  }
  let doc: YamlDocument;
  if (pipeDocs.length > 1) {
    doc = await askToSelectPipeline(pipeDocs, TektonYamlType.Pipeline);
    if (doc === undefined) {
      return undefined;
    }
  } else {
    doc = pipeDocs[0];
  }

  return doc;
}

async function askToSelectPipeline(pipeDocs: YamlDocument[], type: TektonYamlType): Promise<YamlDocument | undefined> {
  const map = new Map<string, YamlDocument>();
  pipeDocs.forEach(doc => map.set(getMetadataName(doc), doc));
  const name = await vscode.window.showQuickPick(Array.from(map.keys()), { placeHolder: `Your file contains more then one ${type}, please select one`, ignoreFocusOut: true });
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
