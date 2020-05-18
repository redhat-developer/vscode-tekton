/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { Tkn, tkn as tknImpl, TektonNode, Command } from '../tkn';
import { PipelineExplorer, pipelineExplorer } from '../pipeline/pipelineExplorer';
import { workspace, window, QuickPickItem } from 'vscode';
import { kubefsUri } from '../util/tektonresources.virtualfs';
import { TknPipelineResource } from '../tekton';
import * as k8s from 'vscode-kubernetes-tools-api';
import { MultiStepInput } from '../util/MultiStepInput';

const errorMessage = {
  Pipeline: 'You need at least one Pipeline available. Please create new Tekton Pipeline and try again.',
  PipelineRun: 'You need at least one PipelineRun available. Please create new Tekton PipelineRun and try again.',
  PipelineResource: 'You need at least one PipelineResource available. Please create new Tekton PipelineResource and try again.',
  Task: 'You need at least one Task available. Please create new Tekton Task and try again.',
  TaskRun: 'You need at least one TaskRun available. Please create new Tekton TaskRun and try again.',
  ClusterTask: 'You need at least one ClusterTask available. Please create new Tekton ClusterTask and try again.',
};

export interface Ref {
  name: string;
  type: string;
}

export interface NameType {
  name: string;
  type: string;
}

export interface Workspaces {
  name: string;
  workspaceName?: string;
  workspaceType?: string;
  key?: string;
  value?: string;
  subPath?: string;
  emptyDir?: string;
}

export interface Resources {
  name: string;
  resourceRef: string;
  resourceType?: string;
}

export interface Params {
  default?: string;
  description: string;
  name: string;
}

export interface StartObject {
  name: string;
  resources: Resources[];
  params: Params[] | undefined;
  workspaces: Workspaces[];
  serviceAccount: string | undefined;
}

export interface Trigger {
  name: string;
  resources: NameType[];
  params?: Params[];
  workspaces?: Workspaces[];
  serviceAcct: string | undefined;
}

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

  static async getTaskRunNames(taskRun: TektonNode): Promise<TektonNode[]> {
    const taskRunList: Array<TektonNode> = await TektonItem.tkn.getTaskRunsForPipelineRun(taskRun);
    if (taskRunList.length === 0) { throw Error(errorMessage.TaskRun); }
    return taskRunList;
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

  static async PipelineResourceReturn(name: string, context: Trigger[]): Promise<Ref[]> {
    let pipeR: TknPipelineResource[] = [];
    const element = context[0].resources.find(e => e.name === name);
    const k8output = await TektonItem.tkn.execute(Command.getPipelineResource());
    try {
      pipeR = JSON.parse(k8output.stdout).items;
    } catch (ignore) {
      // eslint-disable-next-line no-empty
    }
    const pipeResources = pipeR.map<Ref>(value => ({
      name: value.metadata.name,
      type: value.spec.type,
    })).filter(function (obj) {
      return obj.type === element.type;
    });

    return pipeResources;
  }

  static async inputResources(input: MultiStepInput, Ref: Ref[], message: string, item: QuickPickItem): Promise<string> {
    const RefName: QuickPickItem[] = Ref.map<QuickPickItem>(label => ({ label: label.name }));
    const name = item['resourceGitImageType'].charAt(0).toUpperCase() + item['resourceGitImageType'].slice(1)
    const pick = await input.showQuickPick({
      title: `${name} Resource: ${item['label']}`,
      placeholder: `Select ${message} Resources`,
      items: RefName,
    });
    return pick.label;
  }

  static async inputParameters(context: Trigger[], params: QuickPickItem[], message: string): Promise<Params[]> {
    const paramData = [];
    async function collectInputs(): Promise<void> {
      await MultiStepInput.run(input => pickParamGroup(input));
    }
    async function pickParamGroup(input: MultiStepInput): Promise<void> {
      for (const item of params) {
        const selectedParam = context[0].params.find(x => x.name === item.label);
        // return (input: MultiStepInput): Promise<InputStep> => TektonItem.inputParamValue(input, paramVal, message, item['label']);
        const title = `Params: ${item['label']}`;
        const paramVal = await TektonItem.getParamValues(selectedParam.name);
        const pick = await input.showQuickPick({
          title,
          placeholder: `Select ${message} Parameter`,
          items: paramVal,
        });
        if (pick.label === selectedParam.name) {
          const parameter: Params = { name: selectedParam.name, description: selectedParam.description, default: selectedParam.default };
          paramData.push(parameter);
        } else {
          const inputVal = await input.showInputBox({
            title,
            prompt: `Input ${message} default Value`,
            validate: TektonItem.validateInput,
          });
          const parameter: Params = { name: selectedParam.name, description: selectedParam.description, default: inputVal };
          paramData.push(parameter);
        }
      }
    }
    await collectInputs();
    return paramData;
  }

  static async getParamValues(paramName: string): Promise<QuickPickItem[]> | null {
    return ['$(plus) Input New Param Value', paramName]
      .map(label => ({ label }));
  }

  static async validateInput(name: string): Promise<undefined | 'invalid'> {
    const alphaNumHyph = new RegExp(/^[a-zA-Z0-9-_]+$/);
    return name.match(alphaNumHyph) ? undefined : 'invalid';
  }

  static async getServiceAcct(inputStart: StartObject): Promise<QuickPickItem[]> | null {
    return [inputStart.serviceAccount, 'None', 'Input New Service Account']
      .map(label => ({ label }));
  }

  static async pickServiceAcct(inputStart: StartObject): Promise<void> {
    async function collectInputs(): Promise<void> {
      await MultiStepInput.run(input => pickServiceGroup(input));
    }
    async function pickServiceGroup(input: MultiStepInput): Promise<void> {
      const svcAcct = await TektonItem.getServiceAcct(inputStart);
      const pick = await input.showQuickPick({
        title: 'Select Service',
        placeholder: 'Input Service Account',
        items: svcAcct,
      });
      // eslint-disable-next-line require-atomic-updates
      inputStart.serviceAccount = pick.label;
      if (pick.label === (inputStart.serviceAccount || 'None')) {
        return;
      }
      else if (pick.label === 'Input New Service Account') {
        const inputSvcAcct = await input.showInputBox({
          title: 'Provide Service Account Name',
          prompt: 'Input Service Account',
          validate: TektonItem.validateInput,
        });
        // eslint-disable-next-line require-atomic-updates
        inputStart.serviceAccount = inputSvcAcct;
      }
    }
    await collectInputs();
  }

  static async validateTextAndFileName(name: string): Promise<undefined | 'invalid'> {
    const value = new RegExp(/(^[a-zA-Z0-9-_]+.[a-zA-Z0-9-_]+$)/);
    return name.match(value) ? undefined : 'invalid';
  }

  static async pickWorkspace(workspacesList: QuickPickItem[]): Promise<Workspaces[]> {

    const workspaceData = [];

    async function collectInputs(): Promise<void> {
      await MultiStepInput.run(input => pickWorkspaceGroup(input));
    }

    async function pickWorkspaceGroup(input: MultiStepInput, count = 1): Promise<void> {
      for (const item of workspacesList) {
        let key: string, value: string, subPath: string, workspaceName: QuickPickItem | string, emptyDir: string;
        const workspaceList = [{label: 'PersistentVolumeClaim'}, {label: 'EmptyDir'}, {label: 'ConfigMap'}, {label: 'Secret'}];
        const workspaceType = await input.showQuickPick({
          title: `Workspace ${count}: ${item['label']}`,
          placeholder: 'Select workspace type',
          items: workspaceList,
        });
        if (workspaceType.label !== 'EmptyDir') {
          const result = await tknImpl.execute(Command.workspace(workspaceType.label));
          let data: object[];
          try {
            const r = JSON.parse(result.stdout);
            data = r.items ? r.items : data;
            // eslint-disable-next-line no-empty
          } catch (ignore) {
          }
          const workspacesName: QuickPickItem[] | undefined = data ? data.map<QuickPickItem>(label => ({ label: label['metadata'].name })) : undefined;
          if (workspacesName) workspacesName.unshift({label: '$(plus) Add new workspace name.'})
          workspaceName = await input.showQuickPick({
            title: `Workspace ${count}: ${item['label']}`,
            placeholder: `Select ${workspaceType.label}`,
            items: workspacesName,
          });
          if (workspaceName.label === '$(plus) Add new workspace name.') {
            workspaceName = await input.showInputBox({
              title: `Workspace ${count}: ${item['label']}`,
              prompt: `Provide new ${workspaceType.label} name`,
              validate: TektonItem.validateInput,
            });
          }
          if (workspaceType.label === 'ConfigMap') {
            key = await input.showInputBox({
              title: `Workspace ${count}: ${item['label']}`,
              prompt: 'Provide item key name',
              validate: TektonItem.validateInput,
            });
            value = await input.showInputBox({
              title: `workspace ${count}: ${item['label']}`,
              prompt: 'Provide item value name',
              validate: TektonItem.validateTextAndFileName,
            });
          }
          if (workspaceType.label === 'PersistentVolumeClaim') {
            subPath = await input.showInputBox({
              title: `Workspace ${count}: ${item['label']}`,
              prompt: 'Provide subPath',
              validate: TektonItem.validateInput,
            });
          }
        }
        if (workspaceType.label === 'EmptyDir') {
          emptyDir = await input.showInputBox({
            title: `Workspace ${count}: ${item['label']}`,
            prompt: 'Provide EmptyDir name',
            validate: TektonItem.validateInput,
          });
        }
        const selectedWorkspace: Workspaces = {
          name: item['label'],
          workspaceName: workspaceName['label'] ? workspaceName['label'] : workspaceName,
          workspaceType: workspaceType.label,
          key: key ? key : undefined,
          value: value ? value : undefined,
          subPath: subPath ? subPath : undefined,
          emptyDir: emptyDir ? emptyDir : undefined
        };
        workspaceData.push(selectedWorkspace);
        count++;
      }
    }
    await collectInputs();
    return workspaceData;
  }

  static async startObject(context: Trigger[], message: string): Promise<StartObject> {
    const resources: QuickPickItem[] | undefined = context[0].resources ? context[0].resources.map<QuickPickItem>(label => ({ label: label.name, resourceGitImageType: label['type'] ? label['type'] : undefined ,resourceType: label['resourceType'] ? label['resourceType'] : undefined })) : undefined;
    const params: QuickPickItem[] | undefined = context[0].params ? context[0].params.map<QuickPickItem>(label => ({ label: label.name })) : undefined;
    const workspaces: QuickPickItem[] | undefined = context[0].workspaces ? context[0].workspaces.map<QuickPickItem>(label => ({ label: label.name })) : undefined;

    const inputStart = {
      resources: [],
      params: [],
      workspaces: []
    } as StartObject;
    inputStart.name = context[0].name;
    inputStart.serviceAccount = context[0].serviceAcct;

    async function collectInputs(): Promise<void> {
      await MultiStepInput.run(input => pickResourceGroup(input));
    }

    async function pickResourceGroup(input: MultiStepInput): Promise<void> {
      if (resources) {
        for (const item of resources) {
          const Ref = await TektonItem.PipelineResourceReturn(item['label'], context);
          const selectedResource: Resources = {
            name: item['label'],
            resourceType: item['resourceType'],
            resourceRef: await TektonItem.inputResources(input, Ref, message, item),
          };
          inputStart.resources.push(selectedResource);
        }
      }
      if (params) {
        const paramData = await TektonItem.inputParameters(context, params, message);
        paramData.map((value: Params) => {
          inputStart.params.push(value);
        })
      }
      if (inputStart.serviceAccount) {
        await TektonItem.pickServiceAcct(inputStart);
      }
      if (workspaces) {
        const workspaceData = await TektonItem.pickWorkspace(workspaces);
        workspaceData.map((value: Workspaces) => {
          inputStart.workspaces.push(value);
        }) 
      }
    }
    await collectInputs();
    return inputStart;
  }

}
