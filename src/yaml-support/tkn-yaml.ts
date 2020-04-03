/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/
import * as vscode from 'vscode';
import { yamlLocator, YamlMap, YamlSequence, YamlNode, YamlDocument, VirtualDocument } from './yaml-locator';
import * as _ from 'lodash';

const TEKTON_API = 'tekton.dev/';

export enum TektonYamlType {
  Task = 'Task',
  TaskRun = 'TaskRun',
  Pipeline = 'Pipeline',
  PipelineRun = 'PipelineRun',
  PipelineResource = 'PipelineResource'
}

export interface DeclaredResource {
  name: string;
  type: string;
}

export interface DeclaredTask {
  name: string;
  taskRef: string;
  runAfter: string[];
  kind: 'Task' | 'ClusterTask' | string;
  conditions?: string[];
}

export type RunState = 'Cancelled' | 'Finished' | 'Started' | 'Failed' | 'Unknown';

export interface PipelineRunTask extends DeclaredTask {
  state?: RunState;
  startTime?: string;
  completionTime?: string;
  stepsCount?: number;
  finishedSteps?: number;
}


export class TektonYaml {
  isTektonYaml(vsDocument: vscode.TextDocument): TektonYamlType | undefined {
    const yamlDocuments = yamlLocator.getYamlDocuments(vsDocument);
    for (const doc of yamlDocuments) {
      const rootMap = doc.nodes.find(node => node.kind === 'MAPPING') as YamlMap;
      if (rootMap) {
        const apiVersion = getYamlMappingValue(rootMap, 'apiVersion');
        const kind = getYamlMappingValue(rootMap, 'kind');
        if (apiVersion && apiVersion.startsWith(TEKTON_API)) {
          return TektonYamlType[kind];
        }
      }
    }
    return undefined;
  }

  getTektonDocuments(vsDocument: VirtualDocument, type: TektonYamlType): YamlDocument[] | undefined {
    const yamlDocuments = yamlLocator.getYamlDocuments(vsDocument);
    if (!yamlDocuments) {
      return undefined;
    }
    const result: YamlDocument[] = [];
    for (const doc of yamlDocuments) {
      const rootMap = doc.nodes.find(node => node.kind === 'MAPPING') as YamlMap;
      if (rootMap) {
        const apiVersion = getYamlMappingValue(rootMap, 'apiVersion');
        const kind = getYamlMappingValue(rootMap, 'kind');
        if (apiVersion && apiVersion.startsWith(TEKTON_API) && kind === type) {
          result.push(doc);
        }
      }
    }

    return result;
  }

  getMetadataName(doc: YamlDocument): string | undefined {
    const rootMap = doc.nodes.find(node => node.kind === 'MAPPING') as YamlMap;
    if (rootMap) {
      const metadata = findNodeByKey<YamlMap>('metadata', rootMap);
      return getYamlMappingValue(metadata, 'name');
    }

    return undefined;
  }
}

export const tektonYaml = new TektonYaml();

export class PipelineYaml {
  getPipelineTasksRefName(vsDocument: vscode.TextDocument): string[] {
    const result: string[] = [];
    if (tektonYaml.isTektonYaml(vsDocument) === TektonYamlType.Pipeline) {
      const yamlDocuments = yamlLocator.getYamlDocuments(vsDocument);
      for (const doc of yamlDocuments) {
        const rootMap = doc.nodes.find(node => node.kind === 'MAPPING') as YamlMap;
        if (rootMap) {
          const specMap = getSpecMap(rootMap);
          if (specMap) {
            const tasksSeq = getTasksSeq(specMap);
            if (tasksSeq) {
              result.push(...getTasksRefName(tasksSeq.items));
            }
          }
        }
      }
    }

    return result;
  }

  getPipelineTasksName(vsDocument: vscode.TextDocument): string[] {
    const result: string[] = [];
    if (tektonYaml.isTektonYaml(vsDocument) === TektonYamlType.Pipeline) {
      const yamlDocuments = yamlLocator.getYamlDocuments(vsDocument);
      for (const doc of yamlDocuments) {
        const rootMap = doc.nodes.find(node => node.kind === 'MAPPING') as YamlMap;
        if (rootMap) {
          const specMap = getSpecMap(rootMap);
          if (specMap) {
            const tasksSeq = getTasksSeq(specMap);
            if (tasksSeq) {
              result.push(...getTasksName(tasksSeq.items));
            }
          }
        }
      }
    }

    return result;
  }

  getPipelineTasks(doc: YamlDocument): DeclaredTask[] {
    const rootMap = doc.nodes.find(node => node.kind === 'MAPPING') as YamlMap;
    if (rootMap) {
      const specMap = getSpecMap(rootMap);
      return collectTasks(specMap);
    }
  }

  getDeclaredResources(vsDocument: vscode.TextDocument): DeclaredResource[] {
    const result: DeclaredResource[] = [];
    if (tektonYaml.isTektonYaml(vsDocument) === TektonYamlType.Pipeline) {
      const yamlDocuments = yamlLocator.getYamlDocuments(vsDocument);
      for (const doc of yamlDocuments) {
        const rootMap = doc.nodes.find(node => node.kind === 'MAPPING') as YamlMap;
        if (rootMap) {
          const specMap = getSpecMap(rootMap);
          if (specMap) {
            const resourcesSeq = findNodeByKey<YamlSequence>('resources', specMap);
            if (resourcesSeq) {
              for (const res of resourcesSeq.items) {
                if (res.kind === 'MAPPING') {
                  result.push(getDeclaredResource(res as YamlMap));
                }
              }
            }
          }
        }
      }
    }

    return result;
  }
}


export const pipelineYaml = new PipelineYaml();


export class PipelineRunYaml {
  getTektonPipelineRefOrSpec(doc: YamlDocument): string | DeclaredTask[] {
    const rootMap = doc.nodes.find(node => node.kind === 'MAPPING') as YamlMap;
    if (rootMap) {
      const specMap = getSpecMap(rootMap);
      const pipelineRef = findNodeByKey<YamlMap>('pipelineRef', specMap);
      if (pipelineRef) {
        const nameValue = findNodeByKey<YamlNode>('name', pipelineRef);
        if (nameValue) {
          return nameValue.raw;
        }
      }
      const pipelineSpec = findNodeByKey<YamlMap>('pipelineSpec', specMap);
      if (pipelineSpec) {
        return collectTasks(specMap);
      }
    }

    return undefined;
  }

  getPipelineRunName(doc: YamlDocument): string {
    const rootMap = doc.nodes.find(node => node.kind === 'MAPPING') as YamlMap;
    if (rootMap) {
      const metadata = findNodeByKey<YamlMap>('metadata', rootMap);
      return getYamlMappingValue(metadata, 'name');
    }

    return 'PipelineRun name is not defined';
  }

  getPipelineRunStatus(doc: YamlDocument): RunState {
    const rootMap = doc.nodes.find(node => node.kind === 'MAPPING') as YamlMap;
    if (rootMap) {
      const status = findNodeByKey<YamlMap>('status', rootMap);
      if (status) {
        return getPipelineRunTaskState(status);
      }
    }

    return 'Unknown'; // default state
  }

  addPipelineRunTasks(doc: YamlDocument, tasks: DeclaredTask[]): PipelineRunTask[] {
    const taskRuns = getTaskRuns(doc);
    for (const task of tasks) {
      const runTask = task as PipelineRunTask;
      const taskRun = findTaskInTaskRun(task.name, taskRuns);
      if (taskRun) {
        const status = findNodeByKey<YamlMap>('status', taskRun);
        if (status) {
          const completionTime = findNodeByKey<YamlNode>('completionTime', status);
          if (completionTime) {
            runTask.completionTime = _.trim(completionTime.raw, '"');
          }
          const startTime = findNodeByKey<YamlNode>('startTime', status);
          if (startTime) {
            runTask.startTime = _.trim(startTime.raw, '"');
          }
          runTask.state = getPipelineRunTaskState(status);
          const steps = findNodeByKey<YamlSequence>('steps', status);
          if (steps) {
            runTask.stepsCount = steps.items.length;
            let finishedSteps = 0;
            for (const step of steps.items) {
              const terminated = findNodeByKey<YamlMap>('terminated', step as YamlMap);
              if (terminated) {
                finishedSteps++;
              }
            }

            runTask.finishedSteps = finishedSteps;
          }
        }
      } else {
        runTask.state = 'Unknown'; // default state
      }
    }

    return tasks as PipelineRunTask[];
  }
}


export const pipelineRunYaml = new PipelineRunYaml();



function collectTasks(specMap: YamlMap): DeclaredTask[] {
  const result: DeclaredTask[] = [];
  if (specMap) {
    const tasksSeq = getTasksSeq(specMap);
    if (tasksSeq) {
      for (const taskNode of tasksSeq.items) {
        if (taskNode.kind === 'MAPPING') {
          const decTask = {} as DeclaredTask;
          const nameValue = findNodeByKey<YamlNode>('name', taskNode as YamlMap);
          if (nameValue) {
            decTask.name = nameValue.raw;
          }

          const taskRef = findNodeByKey<YamlMap>('taskRef', taskNode as YamlMap);
          if (taskRef) {
            const taskRefName = findNodeByKey<YamlNode>('name', taskRef);
            decTask.taskRef = taskRefName.raw;
            const kindName = findNodeByKey<YamlNode>('kind', taskRef);
            if (kindName) {
              decTask.kind = kindName.raw;
            } else {
              decTask.kind = 'Task';
            }
          }

          decTask.runAfter = getRunAfter(taskNode as YamlMap);
          decTask.conditions = collectConditions(taskNode as YamlMap);
          result.push(decTask);
        }
      }
    }
  }

  return result;
}

function collectConditions(taskNode: YamlMap): string[] | undefined {
  const result: string[] = [];
  const conditions = findNodeByKey<YamlSequence>('conditions', taskNode);
  if (conditions) {
    for (const condition of conditions.items) {
      const ref = getYamlMappingValue(condition as YamlMap, 'conditionRef');
      if (ref) {
        result.push(_.trim(ref, '"'));
      }
    }
    return result;
  }
}

function getRunAfter(taskNode: YamlMap): string[] {
  const result: string[] = [];
  const runAfter = findNodeByKey<YamlSequence>('runAfter', taskNode);
  if (runAfter) {
    for (const run of runAfter.items) {
      if (run.kind === 'SCALAR') {
        result.push(run.raw);
      }
    }
  }

  const resources = findNodeByKey<YamlMap>('resources', taskNode);
  if (resources) {
    const inputs = findNodeByKey<YamlSequence>('inputs', resources);
    if (inputs) {
      for (const input of inputs.items) {
        const fromKey = findNodeByKey<YamlSequence>('from', input as YamlMap);
        if (fromKey) {
          for (const key of fromKey.items) {
            if (key.kind === 'SCALAR') {
              result.push(key.raw);
            }
          }
        }
      }
    }
  }

  const conditions = findNodeByKey<YamlSequence>('conditions', taskNode);
  if (conditions) {
    for (const condition of conditions.items) {
      const resources = findNodeByKey<YamlSequence>('resources', condition as YamlMap);
      if (resources) {
        for (const res of resources.items) {
          const fromKey = findNodeByKey<YamlSequence>('from', res as YamlMap);
          if (fromKey) {
            for (const key of fromKey.items) {
              if (key.kind === 'SCALAR') {
                result.push(key.raw);
              }
            }
          }
        }
      }
    }
  }

  return result;
}


function getPipelineRunTaskState(status: YamlMap): RunState {
  let result: RunState = 'Unknown';
  const startTime = findNodeByKey<YamlNode>('startTime', status);
  if (startTime) {
    result = 'Started';
  }
  const conditionStatus = findNodeByKey<YamlSequence>('conditions', status);
  if (conditionStatus) {
    const status = findNodeByKey<YamlNode>('status', conditionStatus.items[0] as YamlMap);
    if (status) {
      if (status.raw === '"True"') {
        result = 'Finished';
      } else if (status.raw === '"False"') {
        const reason = findNodeByKey<YamlNode>('reason', conditionStatus.items[0] as YamlMap);
        if (reason?.raw === 'TaskRunCancelled') {
          result = 'Cancelled';
        } else {
          result = 'Failed';
        }
      }
    }
  }
  return result;
}

function findTaskInTaskRun(name: string, taskRuns: YamlMap): YamlMap {
  if (!taskRuns) {
    return;
  }
  for (const task of taskRuns.mappings) {
    const taskMap = task.value as YamlMap;
    const result = taskMap.mappings.find(node => node.key.raw === 'pipelineTaskName' && node.value.raw === name);
    if (result) {
      return result.parent as YamlMap;
    }
  }
}

function getTaskRuns(pipelineRun: YamlDocument): YamlMap | undefined {
  const rootMap = pipelineRun.nodes.find(node => node.kind === 'MAPPING') as YamlMap;
  if (rootMap) {
    const statusMap = findNodeByKey<YamlMap>('status', rootMap);
    if (statusMap) {
      return findNodeByKey<YamlMap>('taskRuns', statusMap);
    }
  }

  return undefined;
}

function getDeclaredResource(resMap: YamlMap): DeclaredResource {
  let name: string, type: string;
  for (const item of resMap.mappings) {
    if (item.key.raw === 'name') {
      name = item.value.raw;
    }

    if (item.key.raw === 'type') {
      type = item.value.raw;
    }
  }

  return { name, type };
}

function getSpecMap(rootMap: YamlMap): YamlMap | undefined {
  return findNodeByKey<YamlMap>('spec', rootMap);
}

function getTasksSeq(specMap: YamlMap): YamlSequence | undefined {
  return findNodeByKey<YamlSequence>('tasks', specMap);
}

function findNodeByKey<T>(key: string, yamlMap: YamlMap): T | undefined {
  if (!yamlMap) {
    return;
  }
  const mapItem = yamlMap.mappings.find(item => item.key.raw === key);
  if (mapItem) {
    return mapItem.value as unknown as T;
  }

  return undefined;
}

function getTasksRefName(tasks: YamlNode[]): string[] {
  const result = [];
  for (const taskNode of tasks) {
    if (taskNode.kind === 'MAPPING') {
      const taskRef = findNodeByKey<YamlMap>('taskRef', taskNode as YamlMap);
      if (taskRef) {
        const nameValue = findNodeByKey<YamlNode>('name', taskRef);
        result.push(nameValue.raw);
      }
    }
  }
  return result;
}

function getTasksName(tasks: YamlNode[]): string[] {
  const result = [];
  for (const taskNode of tasks) {
    if (taskNode.kind === 'MAPPING') {
      const nameValue = findNodeByKey<YamlNode>('name', taskNode as YamlMap);
      if (nameValue) {
        result.push(nameValue.raw);
      }
    }
  }
  return result;
}

export enum StringComparison {
  Ordinal,
  OrdinalIgnoreCase
}

// test whether two strings are equal ignore case
export function equalIgnoreCase(a: string, b: string): boolean {
  return _.isString(a) && _.isString(b) && a.toLowerCase() === b.toLowerCase();
}

// Get the string value of key in a yaml mapping node(parsed by node-yaml-parser)
// eg: on the following yaml, this method will return 'value1' for key 'key1'
//
//      key1: value1
//      key2: value2
//
export function getYamlMappingValue(mapRootNode: YamlMap, key: string,
  ignoreCase: StringComparison = StringComparison.Ordinal): string | undefined {
  // TODO, unwrap quotes
  if (!key) {
    return undefined;
  }
  const keyValueItem = mapRootNode.mappings.find((mapping) => mapping.key &&
    (ignoreCase === StringComparison.OrdinalIgnoreCase ? key === mapping.key.raw : equalIgnoreCase(key, mapping.key.raw)));
  return keyValueItem ? keyValueItem.value.raw : undefined;
}
