/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/
import * as vscode from 'vscode';
import { yamlLocator, YamlMap, YamlSequence, YamlNode } from './yaml-locator';
import * as _ from 'lodash';

const TEKTON_API_VERSION = 'tekton.dev/v1alpha1';

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

export function isTektonYaml(vsDocument: vscode.TextDocument): TektonYamlType | undefined {
  const yamlDocuments = yamlLocator.getYamlDocuments(vsDocument);
  for (const doc of yamlDocuments) {
    const rootMap = doc.nodes.find(node => node.kind === 'MAPPING') as YamlMap;
    if (rootMap) {
      const apiVersion = getYamlMappingValue(rootMap, 'apiVersion');
      const kind = getYamlMappingValue(rootMap, 'kind');
      if (apiVersion && apiVersion === TEKTON_API_VERSION) {
        return TektonYamlType[kind];
      }
    }
  }
  return undefined;
}

export function getPipelineTasksRefName(vsDocument: vscode.TextDocument): string[] {
  const result: string[] = [];
  if (isTektonYaml(vsDocument) === TektonYamlType.Pipeline) {
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

export function getPipelineTasksName(vsDocument: vscode.TextDocument): string[] {
  const result: string[] = [];
  if (isTektonYaml(vsDocument) === TektonYamlType.Pipeline) {
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

export function getDeclaredResources(vsDocument: vscode.TextDocument): DeclaredResource[] {
  const result: DeclaredResource[] = [];
  if (isTektonYaml(vsDocument) === TektonYamlType.Pipeline) {
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
