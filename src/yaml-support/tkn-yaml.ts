/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/
import * as vscode from 'vscode';
import { yamlLocator, YamlMap, YamlSequence, YamlNode, YamlDocument, VirtualDocument } from './yaml-locator';
import * as _ from 'lodash';
import { TknElementType } from '../model/element-type';
import { PipelineTask, PipelineTaskCondition } from '../model/pipeline/pipeline-model';

const TEKTON_API = 'tekton.dev/';
const TRIGGER_API = 'triggers.tekton.dev';

export enum TektonYamlType {
  Task = 'Task',
  TaskRun = 'TaskRun',
  Pipeline = 'Pipeline',
  Condition = 'Condition',
  ClusterTask = 'ClusterTask',
  PipelineRun = 'PipelineRun',
  EventListener = 'EventListener',
  TriggerBinding = 'TriggerBinding',
  TriggerTemplate = 'TriggerTemplate',
  PipelineResource = 'PipelineResource',
  ClusterTriggerBinding = 'ClusterTriggerBinding',
}

export interface DeclaredResource {
  name: string;
  type: string;
}

export interface DeclaredTask {
  id: string;
  name: string;
  taskRef: string;
  runAfter: string[];
  kind: 'Task' | 'ClusterTask' | 'Condition' | 'When' | string;
  position?: number;
  final?: boolean;
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

  getRootMap(doc: YamlDocument): YamlMap | undefined {
    return doc.nodes.find(node => node.kind === 'MAPPING') as YamlMap;
  }

  getApiVersion(rootMap: YamlMap): string {
    return getYamlMappingValue(rootMap, 'apiVersion');
  }

  getApiVersionNode(rootMap: YamlMap): YamlNode {
    return findNodeByKey('apiVersion', rootMap);
  }

  getKind(rootMap: YamlMap): string {
    return getYamlMappingValue(rootMap, 'kind');
  }

  getKindNode(rootMap: YamlMap): YamlNode {
    return findNodeByKey('kind', rootMap);
  }

  getName(metadata: YamlMap): string {
    return getYamlMappingValue(metadata, 'name');
  }

  getNameNode(metadata: YamlMap): YamlNode {
    return findNodeByKey('name', metadata);
  }


  getMetadata(rootMap: YamlMap): YamlMap {
    return findNodeByKey<YamlMap>('metadata', rootMap);
  }

  isTektonYaml(vsDocument: vscode.TextDocument): TektonYamlType | undefined {
    const yamlDocuments = yamlLocator.getYamlDocuments(vsDocument);
    for (const doc of yamlDocuments) {
      const type = this.getTektonYamlType(doc);
      if (type) {
        return type;
      }
    }
    return undefined;
  }

  getTektonYamlType(doc: YamlDocument): TektonYamlType | undefined {
    const rootMap = this.getRootMap(doc);
    if (rootMap) {
      const apiVersion = getYamlMappingValue(rootMap, 'apiVersion');
      const kind = getYamlMappingValue(rootMap, 'kind');
      if (apiVersion?.startsWith(TEKTON_API) || apiVersion?.startsWith(TRIGGER_API)) {
        return TektonYamlType[kind];
      }
    }
  }

  getTektonDocuments(vsDocument: VirtualDocument, type: TektonYamlType): YamlDocument[] | undefined {
    const yamlDocuments = yamlLocator.getYamlDocuments(vsDocument);
    if (!yamlDocuments) {
      return undefined;
    }
    const result: YamlDocument[] = [];
    for (const doc of yamlDocuments) {
      const rootMap = this.getRootMap(doc);
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
    const rootMap = this.getRootMap(doc);
    if (rootMap) {
      const metadata = this.getMetadata(rootMap);
      if (metadata) {
        return this.getName(metadata);
      }
    }

    return undefined;
  }

  getCreationTimestamp(doc: YamlDocument): string | undefined {
    const rootMap = this.getRootMap(doc);
    if (rootMap) {
      const metadata = this.getMetadata(rootMap);
      if (metadata) {
        return getYamlMappingValue(metadata, 'creationTimestamp');
      }
    }

    return undefined;
  }

  getApiVersionAndTypePath(vsDocument: vscode.TextDocument): string | undefined {
    const yamlDocuments = yamlLocator.getYamlDocuments(vsDocument);
    if (!yamlDocuments) {
      return undefined;
    }

    for (const doc of yamlDocuments) {
      const rootMap = this.getRootMap(doc);
      if (rootMap) {
        const apiVersion = getYamlMappingValue(rootMap, 'apiVersion');
        const kind = getYamlMappingValue(rootMap, 'kind');
        return `${apiVersion}_${kind}.json`;
      }
    }

    return undefined;
  }
}

export const tektonYaml = new TektonYaml();

export class PipelineYaml {

  getPipelineSpec(rootMap: YamlMap): YamlMap {
    return getSpecMap(rootMap);
  }

  getTasks(specMap: YamlMap): YamlSequence {
    return getTasksSeq(specMap);
  }

  getCustomTasks(vsDocument: vscode.TextDocument): string[]{
    const result: string[] = [];
    if (tektonYaml.isTektonYaml(vsDocument) === TektonYamlType.Pipeline) {
      const yamlDocuments = yamlLocator.getYamlDocuments(vsDocument);
      for (const doc of yamlDocuments) {
        const rootMap = tektonYaml.getRootMap(doc);
        if (rootMap) {
          const specMap = getSpecMap(rootMap);
          if (specMap) {
            const tasksSeq = getTasksSeq(specMap);
            if (tasksSeq) {
              for (const taskNode of tasksSeq.items) {
                if (taskNode.kind === 'MAPPING') {
                  const taskRef = findNodeByKey<YamlMap>('taskRef', taskNode as YamlMap);
                  if (taskRef){
                    const apiVersion = findNodeByKey<YamlNode>('apiVersion', taskRef);
                    const kind = findNodeByKey<YamlNode>('kind', taskRef);
                    const nameValue = findNodeByKey<YamlNode>('name', taskRef);
                    if (nameValue && apiVersion && kind) {
                      result.push(nameValue.raw.trim());
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
    return result;
  }

  getTaskRef(task: YamlMap): [YamlNode, YamlMap] {
    return findNodeAndKeyByKeyValue<YamlNode, YamlMap>('taskRef', task);
  }


  getPipelineTasksRefName(vsDocument: vscode.TextDocument): string[] {
    const result: string[] = [];
    if (tektonYaml.isTektonYaml(vsDocument) === TektonYamlType.Pipeline) {
      const yamlDocuments = yamlLocator.getYamlDocuments(vsDocument);
      for (const doc of yamlDocuments) {
        const rootMap = tektonYaml.getRootMap(doc);
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
        const rootMap = tektonYaml.getRootMap(doc);
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
    const rootMap = tektonYaml.getRootMap(doc);
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
        const rootMap = tektonYaml.getRootMap(doc);
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

  findTask(document: vscode.TextDocument, position: vscode.Position): string | undefined {
    const element = yamlLocator.getMatchedTknElement(document, position);
    if (!element) {
      return undefined;
    }
    if (element.type === TknElementType.PIPELINE_TASK) {
      return (element as PipelineTask).name.value;
    }

    if (element.type === TknElementType.PIPELINE_TASK_CONDITION) {
      return (element as PipelineTaskCondition).conditionRef.value;
    }

    let current = element;
    while (current.parent) {
      current = current.parent;
      if (current.type === TknElementType.PIPELINE_TASK) {
        return (current as PipelineTask).name.value;
      }
      if (current.type === TknElementType.PIPELINE_TASK_CONDITION) {
        return (current as PipelineTaskCondition).conditionRef.value;
      }
    }
    return undefined;
  }
}


export const pipelineYaml = new PipelineYaml();


export class PipelineRunYaml {
  getTektonPipelineRefOrSpec(doc: YamlDocument): string | DeclaredTask[] {
    const rootMap = tektonYaml.getRootMap(doc);
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
        return collectTasks(pipelineSpec);
      }
    }

    return undefined;
  }

  getPipelineRunName(doc: YamlDocument): string | undefined {
    if (!tektonYaml.getCreationTimestamp(doc)){
      return undefined;
    }
    const rootMap = tektonYaml.getRootMap(doc);
    if (rootMap) {
      const metadata = findNodeByKey<YamlMap>('metadata', rootMap);
      return getYamlMappingValue(metadata, 'name');
    }

    return undefined;
  }

  getPipelineRunStatus(doc: YamlDocument): RunState {
    const rootMap = tektonYaml.getRootMap(doc);
    if (rootMap) {
      const status = findNodeByKey<YamlMap>('status', rootMap);
      if (status) {
        return getPipelineRunTaskState(status);
      }
    }

    return 'Unknown'; // default state
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
          const decTask = toDeclaredTask(taskNode as YamlMap);
          decTask.runAfter = collectRunAfter(taskNode as YamlMap, decTask.name);
          collectConditions(taskNode as YamlMap, result);
          collectWhen(taskNode as YamlMap, result, decTask.name);
          result.push(decTask);
        }
      }
    }

    // collect finally tasks
    const finallyTasks = findNodeByKey<YamlSequence>('finally', specMap);
    if (finallyTasks) {
      const lastTasks = getLastTasks(result);
      for (const finalTask of finallyTasks.items) {
        if (finalTask.kind === 'MAPPING') {
          const fTask = toDeclaredTask(finalTask as YamlMap);
          fTask.runAfter = lastTasks;
          fTask.final = true;
          result.push(fTask);
        }
      }
    }
  }

  return result;
}

function getLastTasks(tasks: DeclaredTask[]): string[]{
  const afterTasks = new Set<string>();
  for (const task of tasks) {
    task.runAfter.forEach(v => afterTasks.add(v));
  }

  const result: string[] = [];

  for (const task of tasks) {
    if (!afterTasks.has(task.id)) {
      result.push(task.id);
    }
  }

  return result;
}

function toDeclaredTask(taskNode: YamlMap): DeclaredTask {
  const decTask = {} as DeclaredTask;
  const nameValue = findNodeByKey<YamlNode>('name', taskNode);
  if (nameValue) {
    const name = nameValue.raw?.trim();
    decTask.name = name;
    decTask.id = name;
    decTask.position = nameValue.startPosition;
  }

  const [, taskRef] = pipelineYaml.getTaskRef(taskNode) ?? [];
  if (taskRef) {
    const taskRefName = findNodeByKey<YamlNode>('name', taskRef);
    decTask.taskRef = taskRefName.raw.trim();
    const kindName = findNodeByKey<YamlNode>('kind', taskRef);
    if (kindName) {
      decTask.kind = kindName.raw;
    } else {
      decTask.kind = 'Task';
    }
  } else {
    const taskSpec = findNodeByKey('taskSpec', taskNode);
    if (taskSpec) {
      decTask.kind = 'Task'
    }

  }
  return decTask;
}

function collectWhen(taskNode: YamlMap, tasks: DeclaredTask[], taskName: string): void {
  const whens = findNodeByKey<YamlSequence>('when', taskNode);
  if (whens) {
    for ( const when of whens.items){
      const input = findNodeByKey<YamlNode>('input', when as YamlMap);
      if (input) {
        const inputVal = _.trim(input.raw, '"');
        const whenDec = {id: `${taskName}:${inputVal}`, kind: 'When', position: input.startPosition} as DeclaredTask;

        const runAfter = [];
        const runAfterMap = extractTaskName(inputVal);
        if (runAfterMap) {
          runAfter.push(...runAfterMap.map( v => v[0]));
        }
        runAfter.push(...getTaskRunAfter(taskNode));
        whenDec.runAfter = runAfter;
        tasks.push(whenDec);
      }
    }
  }
}

function collectConditions(taskNode: YamlMap, tasks: DeclaredTask[]): void {

  const conditions = findNodeByKey<YamlSequence>('conditions', taskNode);
  if (conditions) {
    for (const condition of conditions.items) {
      const ref = findNodeByKey<YamlNode>('conditionRef', condition as YamlMap);
      if (ref) {
        const name = _.trim(ref.raw, '"');
        const conditionDec = { id: name, name: name, kind: 'Condition', position: ref.startPosition } as DeclaredTask;

        const runAfter = [];
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
                      runAfter.push(key.raw.trim());
                    }
                  }
                }
              }
            }
          }
        }
        runAfter.push(...getTaskRunAfter(taskNode));
        conditionDec.runAfter = runAfter;
        tasks.push(conditionDec);
      }
    }

  }
}

function collectRunAfter(taskNode: YamlMap, name: string): string[] {
  const result: string[] = [];

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
      const ref = getYamlMappingValue(condition as YamlMap, 'conditionRef');
      if (ref) {
        result.push(_.trim(ref, '"'));
      }
    }
  }

  const whens = findNodeByKey<YamlSequence>('when', taskNode);
  if (whens) {
    for (const when of whens.items) {
      const input = getYamlMappingValue(when as YamlMap, 'input');
      if (input) {
        result.push(`${name}:${_.trim(input, '"')}`);
      }
    }
  }

  const params = findNodeByKey<YamlSequence>('params', taskNode);
  if (params) {
    for (const param of params.items){
      const val = findNodeByKey<YamlNode>('value', param as YamlMap);
      if (val){
        const inputVal = _.trim(val.raw, '"');
        const task = extractTaskName(inputVal);
        if (task){
          result.push(...task.map( v => v[0]));
        }
      
      }
    }
  }

  if (!conditions && !whens) {
    const runAfter = getTaskRunAfter(taskNode);
    result.push(...runAfter);
  }

  return result;
}

function getTaskRunAfter(taskNode: YamlMap): string[] {
  const result = [];
  const runAfter = findNodeByKey<YamlSequence>('runAfter', taskNode);
  if (runAfter) {
    for (const run of runAfter.items) {
      if (run.kind === 'SCALAR') {
        result.push(_.trim(run.raw.trim(), '"'));
      }
    }
  }

  return result;
}

const taskNameAndResultReg = /\$\(tasks\.(?<taskName>[a-zA-Z\d-]+)\.results\.(?<resultName>[a-zA-Z\d-]+)\)/;
const varSubstitution = /\$\([a-zA-Z\d\\.-]+\)/g;
function extractTaskName(variable: string): [string, string][] | undefined {
  if (!variable) {
    return undefined;
  }
  const result: [string, string][] = [];
  // TODO: replace this with String.matchAll call, it available on Node.js 12.0.0
  const vars = variable.match(varSubstitution);
  if (!vars){
    return undefined;
  }
  for (const tknVar of vars) {
    const group = tknVar.match(taskNameAndResultReg)?.groups;
    if (group) {
      result.push([group.taskName, group.resultName]);
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

export function findNodeAndKeyByKeyValue<K, T>(key: string, yamlMap: YamlMap): [K, T] | undefined {
  if (!yamlMap || !yamlMap.mappings) {
    return;
  }
  const mapItem = yamlMap.mappings.find(item => item.key.raw === key);
  if (mapItem) {
    return [mapItem.key as unknown as K, mapItem.value as unknown as T];
  }

  return undefined;
}

export function findNodeByKey<T>(key: string, yamlMap: YamlMap): T | undefined {
  if (!yamlMap || !yamlMap.mappings) {
    return undefined;
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
        result.push(nameValue.raw.trim());
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
