/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { Tkn, tkn as tknImpl, TektonNode } from '../tkn';
import { PipelineExplorer, pipelineExplorer } from '../pipeline/pipelineExplorer';
import { workspace, window } from 'vscode';
import { kubefsUri } from '../util/tektonresources.virtualfs';

const errorMessage = {
  Pipeline: 'You need at least one Pipeline available. Please create new Tekton Pipeline and try again.',
  PipelineRun: 'You need at least one PipelineRun available. Please create new Tekton PipelineRun and try again.',
  PipelineResource: 'You need at least one PipelineResource available. Please create new Tekton PipelineResource and try again.',
  Task: 'You need at least one Task available. Please create new Tekton Task and try again.',
  TaskRun: 'You need at least one TaskRun available. Please create new Tekton TaskRun and try again.',
  ClusterTask: 'You need at least one ClusterTask available. Please create new Tekton ClusterTask and try again.',
};

export abstract class TektonItem {
  protected static readonly tkn: Tkn = tknImpl;
  protected static readonly explorer: PipelineExplorer = pipelineExplorer;

  static validateUniqueName(data: Array<TektonNode>, value: string): string {
    const tektonNode = data.find((tektonNode) => tektonNode.getName() === value);
    return tektonNode && 'This name is already used, please enter different name.';
  }

  static async getPipelineNames(pipeline: TektonNode): Promise<TektonNode[]> {
    const pipelineList: Array<TektonNode> = await TektonItem.tkn.getPipelines(pipeline);
    if (pipelineList.length === 0) { throw Error(errorMessage.Pipeline); }
    return pipelineList;
  }

  static async getPipelinerunNames(pipeline: TektonNode): Promise<TektonNode[]> {
    const pipelineRunList: Array<TektonNode> = await TektonItem.tkn.getPipelineRuns(pipeline);
    if (pipelineRunList.length === 0) { throw Error(errorMessage.PipelineRun); }
    return pipelineRunList;
  }

  static async getTaskNames(task: TektonNode): Promise<TektonNode[]> {
    const taskList: Array<TektonNode> = await TektonItem.tkn.getTasks(task);
    if (taskList.length === 0) { throw Error(errorMessage.Task); }
    return taskList;
  }

  static async getClusterTaskNames(clusterTask: TektonNode): Promise<TektonNode[]> {
    const taskList: Array<TektonNode> = await TektonItem.tkn.getClusterTasks(clusterTask);
    if (taskList.length === 0) { throw Error(errorMessage.ClusterTask); }
    return taskList;
  }

  static async getTaskRunNames(taskrun: TektonNode): Promise<TektonNode[]> {
    const taskrunList: Array<TektonNode> = await TektonItem.tkn.getTaskRunsForPipelineRun(taskrun);
    if (taskrunList.length === 0) { throw Error(errorMessage.TaskRun); }
    return taskrunList;
  }

  static async getPipelineResourceNames(pipelineResource: TektonNode): Promise<TektonNode[]> {
    const pipelineResourceList: Array<TektonNode> = await TektonItem.tkn.getPipelineResources(pipelineResource);
    if (pipelineResourceList.length === 0) { throw Error(errorMessage.PipelineResource); }
    return pipelineResourceList;
  }

  static openInEditor(context: TektonNode): void {
    TektonItem.loadTektonResource(`${context.contextValue}/${context.getName()}`);
  }

  static loadTektonResource(value: string): void {
    const outputFormat = TektonItem.getOutputFormat();
    const uri = kubefsUri(value, outputFormat);
    workspace.openTextDocument(uri).then((doc) => {
      if (doc) {
        window.showTextDocument(doc, { preserveFocus: true, preview: true });
      }
    }, (err) => window.showErrorMessage(`Error loading document: ${err}`));
  }

  static getOutputFormat(): string {
    return workspace.getConfiguration('vs-tekton')['vs-tekton.outputFormat'];
  }
}
