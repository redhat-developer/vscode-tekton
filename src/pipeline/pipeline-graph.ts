/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { tektonYaml, pipelineYaml, pipelineRunYaml, TektonYamlType, DeclaredTask, PipelineRunTask, RunState } from '../yaml-support/tkn-yaml';
import { YamlDocument, VirtualDocument } from '../yaml-support/yaml-locator';
import { ContextType, humanizer } from '../tkn';
import { kubefsUri, resourceDocProvider } from '../util/tektonresources.virtualfs';
import { NodeOrEdge, NodeData, EdgeData } from '../../preview-src/model';
import { PipelineRunData, TaskRuns, TaskRun, TaskRunStatus, PipelineRunConditionCheckStatus } from '../tekton';

const pipelineRunTaskCache = new Map<string, DeclaredTask[]>();

export type GraphProvider = (document: vscode.TextDocument, pipelineRun?: PipelineRunData) => Promise<NodeOrEdge[]>;

export async function calculatePipelineGraph(document: vscode.TextDocument): Promise<NodeOrEdge[]> {

  const doc: YamlDocument = await getPipelineDocument(document, TektonYamlType.Pipeline);
  if (!doc) {
    return []; // TODO: throw error there
  }

  const tasks = pipelineYaml.getPipelineTasks(doc);

  return convertTasksToNode(tasks);
}

export async function calculatePipelineRunGraph(document: vscode.TextDocument, pipelineRun?: PipelineRunData): Promise<NodeOrEdge[]> {
  const doc: YamlDocument = await getPipelineDocument(document, TektonYamlType.PipelineRun);
  if (!doc) {
    return []; // TODO: throw error there
  }
  let tasks: DeclaredTask[];
  const uri = document.uri.toString();
  if (pipelineRunTaskCache.has(uri)) {
    tasks = [...pipelineRunTaskCache.get(uri)];
  } else {
    const refOrSpec = pipelineRunYaml.getTektonPipelineRefOrSpec(doc);
    if (typeof refOrSpec === 'string') {
      // get ref pipeline definition
      const uri = kubefsUri(`${ContextType.PIPELINE}/${refOrSpec}`, 'yaml');
      const pipelineDoc = await resourceDocProvider.loadTektonDocument(uri);
      const pipeDoc = await getPipelineDocument(pipelineDoc, TektonYamlType.Pipeline);
      tasks = pipelineYaml.getPipelineTasks(pipeDoc);

    } else if (Array.isArray(refOrSpec)) {
      tasks = refOrSpec;
    } else {
      tasks = [];
    }

    pipelineRunTaskCache.set(uri, [...tasks]);
  }
  let runTasks: PipelineRunTask[];
  if (pipelineRun) {
    runTasks = updatePipelineRunTasks(pipelineRun, tasks);
  } else {
    const pipelineRunName = tektonYaml.getMetadataName(doc);
    const uri = kubefsUri(`${ContextType.PIPELINERUN}/${pipelineRunName}`, 'json');
    const pipelineDoc = await resourceDocProvider.loadTektonDocument(uri);
    const json = JSON.parse(pipelineDoc.getText());
    runTasks = updatePipelineRunTasks(json, tasks);
  }
  return convertTasksToNode(runTasks);

}

async function getPipelineDocument(document: VirtualDocument, type: TektonYamlType): Promise<YamlDocument | undefined> {
  const pipeDocs = tektonYaml.getTektonDocuments(document, type);
  if (pipeDocs === undefined) {
    return undefined;
  }
  let doc: YamlDocument;
  if (pipeDocs.length > 1) {
    doc = await askToSelectPipeline(pipeDocs, type);
    if (doc === undefined) {
      return undefined;
    }
  } else {
    doc = pipeDocs[0];
  }

  return doc;
}

export async function askToSelectPipeline(pipeDocs: YamlDocument[], type: TektonYamlType): Promise<YamlDocument | undefined> {
  const map = new Map<string, YamlDocument>();
  pipeDocs.forEach(doc => map.set(tektonYaml.getMetadataName(doc), doc));
  const name = await vscode.window.showQuickPick(Array.from(map.keys()), { placeHolder: `Your file contains more then one ${type}, please select one`, ignoreFocusOut: true });
  return map.get(name);
}

function convertTasksToNode(tasks: PipelineRunTask[]): NodeOrEdge[] {
  const result: NodeOrEdge[] = [];
  const tasksMap = new Map<string, PipelineRunTask>();
  tasks.forEach((task: DeclaredTask) => tasksMap.set(task.name, task));

  for (const task of tasks) {
    result.push({ data: { id: task.name, label: getLabel(task), type: task.kind, taskRef: task.taskRef, state: task.state } as NodeData });
    for (const after of task.runAfter) {
      if (tasksMap.has(after)) {
        result.push({ data: { source: after, target: task.name, id: `${after}-${task.name}`, state: tasksMap.get(after).state } as EdgeData });
      }
    }
  }

  return result;
}


function getLabel(task: PipelineRunTask): string {
  let label = task.name;
  if (task.kind === 'Condition') {
    return label;
  }
  if (task.stepsCount && task.finishedSteps) {
    label += ` (${task.finishedSteps}/${task.stepsCount})`;
  }
  if (task.startTime && !task.completionTime) {
    label += ' \n' + humanizer(Date.now() - Date.parse(task.startTime));
  }
  if (task.startTime && task.completionTime) {
    label += ' \n' + humanizer(Date.parse(task.completionTime) - Date.parse(task.startTime));
  }

  return label;
}

function updatePipelineRunTasks(pipelineRun: PipelineRunData, tasks: DeclaredTask[]): PipelineRunTask[] {
  const taskRuns = pipelineRun.status?.taskRuns;
  for (const task of tasks) {
    const runTask = task as PipelineRunTask;

    let taskRun;
    if (task.kind === 'Condition') {
      taskRun = findConditionInTaskRun(task.name, taskRuns);
    } else {
      taskRun = findTaskInTaskRun(task.name, taskRuns);
    }
    if (taskRun) {
      runTask.completionTime = taskRun.status?.completionTime;
      runTask.startTime = taskRun.status?.startTime;
      runTask.state = getPipelineRunTaskState(taskRun.status);
      const steps = taskRun.status?.steps;
      if (steps) {
        runTask.stepsCount = steps.length;
        let finishedSteps = 0;
        for (const step of steps) {
          const terminated = step.terminated;
          if (terminated) {
            finishedSteps++;
          }
        }

        runTask.finishedSteps = finishedSteps;
      }
    } else {
      runTask.state = 'Unknown';
    }
  }

  return tasks as PipelineRunTask[];
}

function findTaskInTaskRun(name: string, taskRuns: TaskRuns): TaskRun | undefined {
  for (const taskRun in taskRuns) {
    const element = taskRuns[taskRun];
    if (element.pipelineTaskName === name) {
      return element;
    }
  }
}

function findConditionInTaskRun(name: string, taskRuns: TaskRuns): PipelineRunConditionCheckStatus | undefined {
  for (const taskRun in taskRuns) {
    const element = taskRuns[taskRun];
    if (element.conditionChecks) {
      for (const conditionRunName in element.conditionChecks) {
        const condition = element.conditionChecks[conditionRunName];
        if (condition.conditionName === name) {
          return condition;
        }
      }
    }
  }
}

function getPipelineRunTaskState(status: TaskRunStatus): RunState {
  let result: RunState = 'Unknown';
  if (!status) {
    return result; // default state
  }
  const startTime = status.startTime;
  if (startTime) {
    result = 'Started';
  }
  const conditionStatus = status.conditions;
  if (conditionStatus) {
    const status = conditionStatus[0]?.status;
    if (status) {
      if (status === 'True') {
        result = 'Finished';
      } else if (status === 'False') {
        const reason = conditionStatus[0]?.reason;
        if (reason === 'TaskRunCancelled') {
          result = 'Cancelled';
        } else {
          result = 'Failed';
        }
      }
    }
  }
  return result;
}
