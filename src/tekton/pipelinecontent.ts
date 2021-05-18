/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { multiStepInput } from '../util/MultiStepInput';
import { TektonItem } from './tektonitem';
import { TknPipelineResource } from '../tekton';
import { QuickPickItem } from 'vscode';
import { Secret, ConfigMap, PVC } from './webviewstartpipeline';
import { Command } from '../cli-command';
import { NewPipelineResources, NewPvc } from './create-resources';

export interface Ref {
  name: string;
  type: string;
}
  
export interface NameType {
  name: string;
  type: string;
}

export interface ItemPath {
  key?: string;
  path?: string;
}
  
export interface Workspaces {
  name: string;
  item?: ItemPath[];
  workspaceName?: string;
  workspaceType?: string;
  key?: string;
  value?: string;
  subPath?: string;
  emptyDir?: string;
}
  
export interface Resources {
  name: string;
  resourceRef?: string;
  resourceType?: string;
}
  
export interface Params {
  default?: string;
  description?: string;
  name: string;
}

export interface VCT {
  kind: string;
  metadata: {
    name: string;
  };
  spec: {
    accessModes: string[];
    resources: {
      requests: {
        storage: string;
      };
    };
    volumeMode?: string;
  };
}
  
export interface StartObject {
  name: string;
  resources?: Resources[];
  newPvc?: NewPvc[];
  newPipelineResource?: NewPipelineResources[];
  params?: Params[] | undefined;
  workspaces?: Workspaces[];
  serviceAccount: string | undefined;
  pipelineResource?: TknPipelineResource[];
  Secret?: Secret[];
  ConfigMap?: ConfigMap[];
  PersistentVolumeClaim?: PVC[];
  pipelineRun?: {
    params: Params[] | undefined;
    resources: Resources[];
    workspaces: Workspaces[];
  };
  commandId?: string;
  volumeClaimTemplate?: VCT[];
}
  
export interface Trigger {
  name: string;
  resources: NameType[];
  params?: Params[];
  workspaces?: Workspaces[];
  serviceAcct: string | undefined;
}
  

export class PipelineContent extends TektonItem {
  static async getPipelineResource(name: string, context: Trigger[]): Promise<Ref[]> {
    let pipeR: TknPipelineResource[] = [];
    const element = context[0].resources.find(e => e.name === name);
    const k8output = await PipelineContent.tkn.execute(Command.getPipelineResource());
    try {
      pipeR = JSON.parse(k8output.stdout).items;
    } catch (ignore) {
      // eslint-disable-next-line no-empty
    }
    const pipeResources = pipeR.map<Ref>(value => ({
      name: value.metadata.name,
      type: value.spec.type,
    })).filter(obj => obj.type === element.type);

    return pipeResources;
  }

  static async inputResources(Ref: Ref[], item: QuickPickItem): Promise<string> {
    let resourceName: QuickPickItem | string;
    const createPipelineResource = '$(plus) Create Pipeline Resource.'
    const RefName: QuickPickItem[] = Ref.map<QuickPickItem>(label => ({ label: label.name }));
    RefName.unshift({label: createPipelineResource})
    const name = item['resourceGitImageType'].charAt(0).toUpperCase() + item['resourceGitImageType'].slice(1)
    resourceName = await multiStepInput.showQuickPick({
      title: `${name} Resource: ${item['label']}`,
      placeholder: 'Select Pipeline Resources',
      items: RefName,
    });
    if (resourceName.label === createPipelineResource) {
      resourceName = await multiStepInput.showInputBox({
        title: `${name} Resource: ${item['label']}`,
        prompt: 'Please provide Name/URL',
        validate: PipelineContent.validateInput,
      });
    }
    return (resourceName['label']) ? resourceName['label'] : resourceName;
  }

  static async inputParameters(context: Trigger[], params: QuickPickItem[], message: string): Promise<Params[]> {
    const paramData = [];
    for (const item of params) {
      const selectedParam = context[0].params.find(x => x.name === item.label);
      const title = `Params: ${item['label']}`;
      if (!selectedParam.default) {
        const inputVal = await multiStepInput.showInputBox({
          title,
          prompt: `Input ${message} default Value`,
          validate: PipelineContent.validateInput,
        });
        const parameter: Params = { name: selectedParam.name, description: selectedParam.description, default: inputVal };
        paramData.push(parameter);
      } else {
        const parameter: Params = { name: selectedParam.name, description: selectedParam.description, default: selectedParam.default };
        paramData.push(parameter);
      }
    }
    return paramData;
  }

  static async validateInput(name: string): Promise<undefined | 'invalid'> {
    const alphaNum = new RegExp(/^[a-zA-Z0-9-_]+$/);
    return name.match(alphaNum) ? undefined : 'invalid';
  }

  static async getServiceAcct(inputStart: StartObject): Promise<QuickPickItem[]> | null {
    return ['$(plus) Add New Service Account', 'None', inputStart.serviceAccount]
      .map(label => ({ label }));
  }

  static async pickServiceAcct(inputStart: StartObject): Promise<void> {
    const svcAcct = await PipelineContent.getServiceAcct(inputStart);
    const pick = await multiStepInput.showQuickPick({
      title: 'Select Service',
      placeholder: 'Input Service Account',
      items: svcAcct,
    });
    // eslint-disable-next-line require-atomic-updates
    inputStart.serviceAccount = pick.label;
    if (pick.label === (inputStart.serviceAccount || 'None') && pick.label !== '$(plus) Add New Service Account') {
      return;
    } else if (pick.label === '$(plus) Add New Service Account') {
      const inputSvcAcct = await multiStepInput.showInputBox({
        title: 'Provide Service Account Name',
        prompt: 'Input Service Account',
        validate: PipelineContent.validateInput,
      });
      // eslint-disable-next-line require-atomic-updates
      inputStart.serviceAccount = inputSvcAcct['label'];
    }
  }

  static async validateTextAndFileName(name: string): Promise<undefined | 'invalid'> {
    const value = new RegExp(/(^[a-zA-Z0-9-_]+.[a-zA-Z0-9-_]+$)/);
    return name.match(value) ? undefined : 'invalid';
  }

  static async pickWorkspace(workspacesList: QuickPickItem[], count = 1): Promise<Workspaces[]> {

    const workspaceData = [];

    for (const item of workspacesList) {
      let key: string, value: string, subPath: string, workspaceName: QuickPickItem | string;
      const workspaceList = [{label: 'PersistentVolumeClaim'}, {label: 'EmptyDir'}, {label: 'ConfigMap'}, {label: 'Secret'}];
      const workspaceType = await multiStepInput.showQuickPick({
        title: `Workspace ${count}: ${item['label']}`,
        placeholder: 'Select workspace type',
        items: workspaceList,
      });
      if (workspaceType.label !== 'EmptyDir') {
        const result = await PipelineContent.tkn.execute(Command.workspace(workspaceType.label));
        let data: object[];
        try {
          const r = JSON.parse(result.stdout);
          data = r.items ? r.items : data;
          // eslint-disable-next-line no-empty
        } catch (ignore) {
        }
        const workspacesName: QuickPickItem[] | undefined = data ? data.map<QuickPickItem>(label => ({ label: label['metadata'].name })) : undefined;
        workspaceName = await multiStepInput.showQuickPick({
          title: `Workspace ${count}: ${item['label']}`,
          placeholder: `Select ${workspaceType.label}`,
          items: workspacesName,
        });
        if (workspaceType.label === 'ConfigMap') {
          key = await multiStepInput.showInputBox({
            title: `Workspace ${count}: ${item['label']}`,
            prompt: 'Provide item key name',
            validate: PipelineContent.validateInput,
          });
          value = await multiStepInput.showInputBox({
            title: `workspace ${count}: ${item['label']}`,
            prompt: 'Provide item value name',
            validate: PipelineContent.validateTextAndFileName,
          });
        }
        if (workspaceType.label === 'PersistentVolumeClaim') {
          subPath = await multiStepInput.showInputBox({
            title: `Workspace ${count}: ${item['label']}`,
            prompt: 'Provide subPath',
            validate: PipelineContent.validateInput,
          });
        }
      }

      const selectedWorkspace: Workspaces = {
        name: item['label'],
        workspaceName: workspaceName?.['label'] ? workspaceName['label'] : workspaceName,
        workspaceType: workspaceType.label,
        key: key ? key : undefined,
        value: value ? value : undefined,
        subPath: subPath ? subPath : undefined
      };
      workspaceData.push(selectedWorkspace);
      count++;
    }
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

    if (resources) {
      for (const item of resources) {
        const Ref = await PipelineContent.getPipelineResource(item['label'], context);
        const selectedResource: Resources = {
          name: item['label'],
          resourceType: item['resourceType'],
          resourceRef: await PipelineContent.inputResources(Ref, item),
        };
        inputStart.resources.push(selectedResource);
      }
    }
    if (params) {
      const paramData = await PipelineContent.inputParameters(context, params, message);
      paramData.map((value: Params) => { inputStart.params.push(value); })
    }
    if (inputStart.serviceAccount) {
      await PipelineContent.pickServiceAcct(inputStart);
    }
    if (workspaces) {
      const workspaceData = await PipelineContent.pickWorkspace(workspaces);
      workspaceData.map((value: Workspaces) => { inputStart.workspaces.push(value); }) 
    }
    return inputStart;
  }
}
