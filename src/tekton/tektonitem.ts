/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { Tkn, tkn as tknImpl, TektonNode } from '../tkn';
import { PipelineExplorer, pipelineExplorer } from '../pipeline/pipelineExplorer';
import { workspace, window, QuickPickItem } from 'vscode';
import { kubefsUri } from '../util/tektonresources.virtualfs';
import { TknPipelineResource } from '../tekton';
import * as k8s from 'vscode-kubernetes-tools-api';
import { MultiStepInput, InputStep } from '../util/MultiStepInput';

const errorMessage = {
  Pipeline: 'You need at least one Pipeline available. Please create new Tekton Pipeline and try again.',
  PipelineRun: 'You need at least one PipelineRun available. Please create new Tekton PipelineRun and try again.',
  PipelineResource: 'You need at least one PipelineResource available. Please create new Tekton PipelineResource and try again.',
  Task: 'You need at least one Task available. Please create new Tekton Task and try again.',
  TaskRun: 'You need at least one TaskRun available. Please create new Tekton TaskRun and try again.',
  ClusterTask: 'You need at least one ClusterTask available. Please create new Tekton ClusterTask and try again.',
};

export interface NameType {
  name: string;
  type: string;
}

export interface Resources {
  name: string;
  resourceRef: string;
  resourceType?: string;
}

export interface Params {
  default: string;
  description: string;
  name: string;
}

export interface StartObject {
  name: string;
  resources: Resources[];
  params: Params[];
  serviceAccount: string | undefined;
}

export interface Trigger {
  name: string;
  resources: NameType[];
  params?: Params[];
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

  static async startObject(context: Trigger[], message: string): Promise<StartObject> {
    const resources: QuickPickItem[] = context[0].resources ? context[0].resources.map<QuickPickItem>(label => ({ label: label.name, resourceType: label['resourceType'] ? label['resourceType'] : undefined })) : undefined;
    const params: QuickPickItem[] | undefined = context[0].params ? context[0].params.map<QuickPickItem>(label => ({ label: label.name })) : undefined;

    const title = `Start ${message}`;

    interface Ref {
      name: string;
      type: string;
    }

    const inputStart = {
      resources: [],
      params: [],
    } as StartObject;
    inputStart.name = context[0].name;
    inputStart.serviceAccount = context[0].serviceAcct;

    async function collectInputs(): Promise<void> {
      await MultiStepInput.run(input => pickResourceGroup(input));
    }

    async function pickResourceGroup(input: MultiStepInput): Promise<InputStep> {
      if (resources) {
        const pick = await input.showQuickPick({
          title,
          placeholder: `Input ${message} resources`,
          items: resources,
        });
        const Ref = await PipelineResourceReturn(pick.label);
        resources.splice(resources.indexOf(pick), 1);
        const selectedResource: Resources = {
          name: pick.label,
          resourceType: pick['resourceType'],
          resourceRef: await inputResources(input, Ref),
        };
        inputStart.resources.push(selectedResource);
        if (resources.length > 0) {
          return pickResourceGroup(input);
        }
      }
      if (params) {
        return (input: MultiStepInput): Promise<InputStep> => inputParameters(input);
      }
      if (inputStart.serviceAccount) {
        return (input: MultiStepInput): Promise<InputStep> => pickServiceAcct(input);
      }
    }

    async function inputResources(input: MultiStepInput, Ref: Ref[]): Promise<string> {
      const RefName: QuickPickItem[] = Ref.map<QuickPickItem>(label => ({ label: label.name }));
      const pick = await input.showQuickPick({
        title,
        placeholder: `Input ${message} Resources`,
        items: RefName,
      });
      return pick.label;
    }

    async function inputParameters(input: MultiStepInput): Promise<InputStep> {
      const pick = await input.showQuickPick({
        title,
        placeholder: `Select ${message} Parameter Name`,
        items: params,
      });
      params.splice(params.indexOf(pick), 1);
      const paramVal = context[0].params.find(x => x.name === pick.label);
      return (input: MultiStepInput): Promise<InputStep> => inputParamValue(input, paramVal);
    }

    async function inputParamValue(input: MultiStepInput, selectedParam: Params): Promise<InputStep> {
      const paramVal = await getParamValues(selectedParam.name);
      const pick = await input.showQuickPick({
        title,
        placeholder: `Input ${message} Parameter defaults`,
        items: paramVal,
      });
      if (pick.label === selectedParam.name) {
        const parameter: Params = { name: selectedParam.name, description: selectedParam.description, default: selectedParam.default };
        inputStart.params.push(parameter);
      }
      else {
        const inputVal = await input.showInputBox({
          title,
          prompt: `Input ${message} default Value`,
          validate: validateInput,
        });
        const parameter: Params = { name: selectedParam.name, description: selectedParam.description, default: inputVal };
        inputStart.params.push(parameter);
      }
      if (params.length > 0) {
        return inputParameters(input);
      }
      if (inputStart.serviceAccount) {
        return (input: MultiStepInput): Promise<InputStep> => pickServiceAcct(input);
      }
      return;
    }

    async function pickServiceAcct(input: MultiStepInput): Promise<InputStep> {
      const svcAcct = await getServiceAcct();
      const pick = await input.showQuickPick({
        title,
        placeholder: 'Input Service Account',
        items: svcAcct,
      });
      inputStart.serviceAccount = pick.label;
      if (pick.label === (inputStart.serviceAccount || 'None')) {
        return;
      }
      else if (pick.label === 'Input New Service Account') {
        const inputSvcAcct = await input.showInputBox({
          title,
          prompt: 'Input Service Account',
          validate: validateInput,
        });
        // eslint-disable-next-line require-atomic-updates
        inputStart.serviceAccount = inputSvcAcct;
      }
    }

    async function PipelineResourceReturn(name: string): Promise<Ref[]> {
      let pipeR: TknPipelineResource[] = [];
      const element = context[0].resources.find(e => e.name === name);
      const kubectl = await k8s.extension.kubectl.v1;
      if (kubectl.available) {
        const k8output = await kubectl.api.invokeCommand('get pipelineresources -o json');
        try {
          pipeR = JSON.parse(k8output.stdout).items;
        } catch (ignore) {
          // eslint-disable-next-line no-empty
        }
      }
      const pipeResources = pipeR.map<Ref>(value => ({
        name: value.metadata.name,
        type: value.spec.type,
      })).filter(function (obj) {
        return obj.type === element.type;
      });

      return pipeResources;
    }

    async function validateInput(name: string): Promise<undefined | 'invalid'> {
      const alphaNumHyph = new RegExp(/^[a-zA-Z0-9-_]+$/);
      return name.match(alphaNumHyph) ? undefined : 'invalid';
    }

    async function getParamValues(paramName: string): Promise<QuickPickItem[]> | null {
      return [paramName, 'Input New Param Value']
        .map(label => ({ label }));
    }

    async function getServiceAcct(): Promise<QuickPickItem[]> | null {
      return [inputStart.serviceAccount, 'None', 'Input New Service Account']
        .map(label => ({ label }));
    }

    await collectInputs();
    return inputStart;
  }
}
