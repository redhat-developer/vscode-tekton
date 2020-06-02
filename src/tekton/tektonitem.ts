/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { Tkn, tkn as tknImpl, TektonNode } from '../tkn';
import { PipelineExplorer, pipelineExplorer } from '../pipeline/pipelineExplorer';
import { workspace, window } from 'vscode';
import { tektonFSUri } from '../util/tekton-vfs';

const errorMessage = {
  Pipeline: 'You need at least one Pipeline available. Please create new Tekton Pipeline and try again.',
  PipelineRun: 'You need at least one PipelineRun available. Please create new Tekton PipelineRun and try again.',
  PipelineResource: 'You need at least one PipelineResource available. Please create new Tekton PipelineResource and try again.',
  Task: 'You need at least one Task available. Please create new Tekton Task and try again.',
  TaskRun: 'You need at least one TaskRun available. Please create new Tekton TaskRun and try again.',
  ClusterTask: 'You need at least one ClusterTask available. Please create new Tekton ClusterTask and try again.',
  EventListener: 'You need at least one EventListener available. Please create new Tekton EventListener and try again.',
  TriggerBinding: 'You need at least one TriggerBinding available. Please create new Tekton TriggerBinding and try again.',
  TriggerTemplate: 'You need at least one TriggerTemplate available. Please create new Tekton TriggerTemplate and try again.'
};

export abstract class TektonItem {
  protected static readonly tkn: Tkn = tknImpl;
  protected static readonly explorer: PipelineExplorer = pipelineExplorer;

  static validateUniqueName(data: Array<TektonNode>, value: string): string {
    const tektonNode = data.find((tektonNode) => tektonNode.getName() === value);
    return tektonNode && 'This name is already used, please enter different name.';
  }

  static async getPipelineNames(): Promise<TektonNode[]> {
    const pipelineList: Array<TektonNode> = await TektonItem.tkn.getPipelines();
    if (pipelineList.length === 0) { throw Error(errorMessage.Pipeline); }
    return pipelineList;
  }

  static async getPipelineNode(): Promise<TektonNode> {
    const pipelineNode: Array<TektonNode> = await TektonItem.tkn.getPipelineNodes();
    return pipelineNode[0];
  }

  static async getPipelineRunNames(): Promise<TektonNode[]> {
    const pipelineRunList: Array<TektonNode> = await TektonItem.tkn.getPipelineRunsList();
    if (pipelineRunList.length === 0) { throw Error(errorMessage.PipelineRun); }
    return pipelineRunList;
  }

  static async getTaskNames(): Promise<TektonNode[]> {
    const taskList: Array<TektonNode> = await TektonItem.tkn.getTasks();
    if (taskList.length === 0) { throw Error(errorMessage.Task); }
    return taskList;
  }

  static async getTaskRunNames(): Promise<TektonNode[]> {
    const taskRunList: Array<TektonNode> = await TektonItem.tkn.getTaskRunList();
    if (taskRunList.length === 0) { throw Error(errorMessage.TaskRun); }
    return taskRunList;
  }

  static async getClusterTaskNames(): Promise<TektonNode[]> {
    const taskList: Array<TektonNode> = await TektonItem.tkn.getClusterTasks();
    if (taskList.length === 0) { throw Error(errorMessage.ClusterTask); }
    return taskList;
  }

  static async getEventListenerNames(): Promise<TektonNode[]> {
    const eventListenerList: Array<TektonNode> = await TektonItem.tkn.getEventListener();
    if (eventListenerList.length === 0) { throw Error(errorMessage.EventListener); }
    return eventListenerList;
  }

  static async getTriggerBindingNames(): Promise<TektonNode[]> {
    const triggerBindingList: Array<TektonNode> = await TektonItem.tkn.getTriggerBinding();
    if (triggerBindingList.length === 0) { throw Error(errorMessage.TriggerBinding); }
    return triggerBindingList;
  }

  static async getTriggerTemplateNames(): Promise<TektonNode[]> {
    const triggerTemplateList: Array<TektonNode> = await TektonItem.tkn.getTriggerTemplates();
    if (triggerTemplateList.length === 0) { throw Error(errorMessage.TriggerTemplate); }
    return triggerTemplateList;
  }

  static async getPipelineResourceNames(): Promise<TektonNode[]> {
    const pipelineResourceList: Array<TektonNode> = await TektonItem.tkn.getPipelineResources();
    if (pipelineResourceList.length === 0) { throw Error(errorMessage.PipelineResource); }
    return pipelineResourceList;
  }

  static openInEditor(context: TektonNode): void {
    TektonItem.loadTektonResource(context.contextValue, context.getName());
  }

  static loadTektonResource(type: string, name: string): void {
    const outputFormat = TektonItem.getOutputFormat();
    const uri = tektonFSUri(type, name, outputFormat);
    workspace.openTextDocument(uri).then((doc) => {
      if (doc) {
        window.showTextDocument(doc, { preserveFocus: true, preview: true });
      }
    }, (err) => {
      if (type === 'taskrun') {
        window.showErrorMessage('TaskRun may not have started yet, try again when it starts running');
      } else {
        window.showErrorMessage(`Error loading document: ${err}`)
      }
    });
  }

  static getOutputFormat(): string {
    return workspace.getConfiguration('vs-tekton')['outputFormat'];
  }
}
