/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/
import { tkn } from '../tkn';
import { TknTask } from '../tekton';
import { Snippet } from './snippet';
import * as NodeCache from 'node-cache';

const cache = new NodeCache({stdTTL: 120, checkperiod: 120});
const tasksKey = 'tasks';

interface TaskSnippet {
  name: string;
  taskRef: TaskRef;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  taskSpec?: any; // TODO check this
  conditions?: PipelineTaskCondition[];
  retries?: number;
  runAfter?: string[];
  resources?: PipelineTaskResources;
  params?: Param[];

}

interface PipelineTaskCondition {
  conditionRef: string;
  params?: Param[];
  resources: PipelineTaskInputResource[];
}

interface PipelineTaskResources {
  inputs?: PipelineTaskInputResource[];
  outputs?: PipelineTaskOutputResource[];
}

interface PipelineTaskInputResource {
  name: string;
  resource: string;
  from?: string[];
}

interface PipelineTaskOutputResource {
  name: string;
  resource: string;
}

interface TaskRef {
  name: string;
  kind?: 'Task' | 'ClusterTask';
}

interface Param {
  name: string;
  value: string | string[];
}

export async function getRawTasks(forceLoad?: boolean): Promise<TknTask[]> {
  let allRawTasks: TknTask[] = [];
  if (cache.has(tasksKey) && !forceLoad){
    allRawTasks = cache.get(tasksKey);
  } else {
    const [rawClusterTasks, rawTasks] = await Promise.all([tkn.getRawClusterTasks(), tkn.getRawTasks()]);
    if (rawClusterTasks) {
      allRawTasks = rawClusterTasks.concat(rawTasks);
    }
    cache.set(tasksKey, allRawTasks);
  }
  return allRawTasks;
}

export async function getTknTasksSnippets(): Promise<Snippet<TaskSnippet>[]> {
  const tasks = await getRawTasks();
  const snippets = convertTasksToSnippet(tasks);
  return snippets;
}

export function convertTasksToSnippet(rawTasks: TknTask[]): Snippet<TaskSnippet>[] {
  const result: Snippet<TaskSnippet>[] = [];
  if (!rawTasks) return result;
  for (const task of rawTasks) {
    result.push({
      label: task.metadata.name,
      description: task.kind,
      body: convertTaskToSnippet(task)
    })
  }
  return result;
}

function convertTaskToSnippet(task: TknTask): TaskSnippet {
  let placeHolder = 1;
  const result: TaskSnippet = {
    name: '$' + placeHolder++,
    taskRef: {
      name: task.metadata.name
    }
  };

  if (task.kind === 'ClusterTask') {
    result.taskRef.kind = task.kind;

  }
  if (task.spec.inputs?.resources || task.spec.outputs?.resources) {
    result.resources = {};
  }

  if (task.spec.inputs?.params) {
    const params: Param[] = [];
    for (const rawParam of task.spec.inputs.params) {
      params.push({
        name: rawParam.name,
        value: rawParam.default ? rawParam.default : '$' + placeHolder++
      });
    }
    if (params.length > 0) {
      result.params = params;
    }
  }

  if (task.spec.inputs) {
    const rawInputs = task.spec.inputs;
    if (rawInputs.resources) {
      const inputs: PipelineTaskInputResource[] = [];
      for (const rawInput of rawInputs.resources) {
        inputs.push({
          name: rawInput.name,
          resource: '$' + placeHolder++,
        });
      }
      result.resources.inputs = inputs;
    }

  }

  if (task.spec.outputs?.resources) {
    const rawOutputs = task.spec.outputs;
    const outputs: PipelineTaskOutputResource[] = [];
    for (const rawOutput of rawOutputs.resources) {
      outputs.push({
        name: rawOutput.name,
        resource: '$' + placeHolder++,
      });
    }

    result.resources.outputs = outputs;
  }


  return result;

}
