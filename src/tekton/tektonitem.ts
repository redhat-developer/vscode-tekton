/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { Tkn, tkn as tknImpl } from '../tkn';
import { PipelineExplorer, pipelineExplorer } from '../pipeline/pipelineExplorer';
import { workspace, window } from 'vscode';
import { tektonFSUri } from '../util/tekton-vfs';
import { TknResourceItem } from './webviewstartpipeline';
import { telemetryLogCommand, telemetryLogError } from '../telemetry';
import { Command } from '../util/command';
import { ContextType } from '../context-type';
import { TektonNode } from '../tree-view/tekton-node';

export const errorMessage = {
  Pipeline: 'You need at least one Pipeline available. Please create new Tekton Pipeline and try again.',
  PipelineRun: 'You need at least one PipelineRun available. Please create new Tekton PipelineRun and try again.',
  PipelineResource: 'You need at least one PipelineResource available. Please create new Tekton PipelineResource and try again.',
  Task: 'You need at least one Task available. Please create new Tekton Task and try again.',
  TaskRun: 'You need at least one TaskRun available. Please create new Tekton TaskRun and try again.',
  ClusterTask: 'You need at least one ClusterTask available. Please create new Tekton ClusterTask and try again.',
  EventListener: 'You need at least one EventListener available. Please create new Tekton EventListener and try again.',
  TriggerBinding: 'You need at least one TriggerBinding available. Please create new Tekton TriggerBinding and try again.',
  TriggerTemplate: 'You need at least one TriggerTemplate available. Please create new Tekton TriggerTemplate and try again.',
  Condition: 'You need at least one Condition available. Please create new Tekton Condition and try again.',
};

export abstract class TektonItem {
  static readonly tkn: Tkn = tknImpl;
  static readonly explorer: PipelineExplorer = pipelineExplorer;

  static validateUniqueName(data: Array<TektonNode>, value: string): string {
    const tektonNode = data.find((tektonNode) => tektonNode.getName() === value);
    return tektonNode && 'This name is already used, please enter different name.';
  }

  static async getPipelineNames(): Promise<TektonNode[]> {
    const pipelineList: Array<TektonNode> = await TektonItem.tkn.getPipelines();
    if (pipelineList.length === 0) throw Error(errorMessage.Pipeline);
    return pipelineList;
  }

  static async getConditionNames(): Promise<TektonNode[]> {
    const conditionList: Array<TektonNode> = await TektonItem.tkn.getConditions();
    if (conditionList.length === 0) { throw Error(errorMessage.Condition); }
    return conditionList;
  }

  static async getPipelineNode(): Promise<TektonNode> {
    const pipelineNode: Array<TektonNode> = await TektonItem.tkn.getPipelineNodes();
    return pipelineNode[0];
  }

  static async getPipelineRunNames(): Promise<TektonNode[]> {
    const pipelineRunList: Array<TektonNode> = await TektonItem.tkn.getPipelineRunsList();
    if (pipelineRunList.length === 0) throw Error(errorMessage.PipelineRun);
    return pipelineRunList;
  }

  static async getTaskNames(): Promise<TektonNode[]> {
    const taskList: Array<TektonNode> = await TektonItem.tkn.getTasks();
    if (taskList.length === 0) throw Error(errorMessage.Task);
    return taskList;
  }

  static async getTaskRunNames(): Promise<TektonNode[]> {
    const taskRunList: Array<TektonNode> = await TektonItem.tkn.getTaskRunList();
    if (taskRunList.length === 0) throw Error(errorMessage.TaskRun);
    return taskRunList;
  }

  static async getClusterTaskNames(): Promise<TektonNode[]> {
    const taskList: Array<TektonNode> = await TektonItem.tkn.getClusterTasks();
    if (taskList.length === 0) throw Error(errorMessage.ClusterTask);
    return taskList;
  }

  static async getEventListenerNames(): Promise<TektonNode[]> {
    const eventListenerList: Array<TektonNode> = await TektonItem.tkn.getEventListener();
    if (eventListenerList.length === 0) throw Error(errorMessage.EventListener);
    return eventListenerList;
  }

  static async getTriggerBindingNames(): Promise<TektonNode[]> {
    const triggerBindingList: Array<TektonNode> = await TektonItem.tkn.getTriggerBinding();
    if (triggerBindingList.length === 0) throw Error(errorMessage.TriggerBinding);
    return triggerBindingList;
  }

  static async getTriggerTemplateNames(): Promise<TektonNode[]> {
    const triggerTemplateList: Array<TektonNode> = await TektonItem.tkn.getTriggerTemplates();
    if (triggerTemplateList.length === 0) throw Error(errorMessage.TriggerTemplate);
    return triggerTemplateList;
  }

  static async getPipelineResourceNames(): Promise<TektonNode[]> {
    const pipelineResourceList: Array<TektonNode> = await TektonItem.tkn.getPipelineResources();
    if (pipelineResourceList.length === 0) throw Error(errorMessage.PipelineResource);
    return pipelineResourceList;
  }

  static openInEditor(context: TektonNode, commandId?: string): void {
    let name = context.getName();
    if (context.contextValue === ContextType.CONDITIONTASKRUN) {
      for (const conditionName in context.getParent()['rawTaskRun'].conditionChecks) {
        if (context.getParent()['rawTaskRun'].conditionChecks[conditionName].conditionName === name) {
          name = conditionName;
        }
      }
    }
    TektonItem.loadTektonResource(context.contextValue, name, context.uid, commandId);
  }

  static loadTektonResource(type: string, name: string, uid: string, commandId?: string): void {
    const outputFormat = TektonItem.getOutputFormat();
    const uri = tektonFSUri(type, name, outputFormat, uid);
    workspace.openTextDocument(uri).then((doc) => {
      if (doc) {
        telemetryLogCommand(commandId, 'successfully open in editor');
        window.showTextDocument(doc, { preserveFocus: true, preview: true });
      }
    }, (err) => {
      if (type === 'taskrun') {
        const message = 'TaskRun may not have started yet, try again when it starts running';
        telemetryLogError(commandId, message);
        window.showErrorMessage(message);
      } else {
        telemetryLogError(commandId, err);
        window.showErrorMessage(`Error loading document: ${err}`)
      }
    });
  }

  static getOutputFormat(): string {
    return workspace.getConfiguration('vs-tekton')['outputFormat'];
  }

  static startQuickPick(): boolean {
    return workspace
      .getConfiguration('vs-tekton')
      .get<boolean>('start');
  }

  static ShowPipelineRun(): boolean {
    return workspace
      .getConfiguration('vs-tekton')
      .get<boolean>('pipelineRun');
  }

  static async workspaceData(pipelineData: TknResourceItem): Promise<void> {
    const secret = await TektonItem.tkn.execute(Command.workspace('Secret'), process.cwd(), false);
    pipelineData.Secret = JSON.parse(secret.stdout).items;
    const configMap = await TektonItem.tkn.execute(Command.workspace('ConfigMap'), process.cwd(), false);
    pipelineData.ConfigMap = JSON.parse(configMap.stdout).items;
    const pvc = await TektonItem.tkn.execute(Command.workspace('PersistentVolumeClaim'), process.cwd(), false);
    pipelineData.PersistentVolumeClaim = JSON.parse(pvc.stdout).items;
  }

  static async pipelineResourcesList(pipelineData: TknResourceItem ): Promise<void> {
    const resource = await TektonItem.tkn.execute(Command.getPipelineResource(), process.cwd(), false);
    pipelineData.pipelineResource = JSON.parse(resource.stdout).items;
  }
}
