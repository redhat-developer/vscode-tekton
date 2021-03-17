/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { TektonNode } from '../tkn';
import { TknResourceItem, TknPipelineRun } from './webviewstartpipeline';
import { TektonItem } from './tektonitem';
import { TknSpec } from '../tekton';
import { Command } from '../util/command';

interface PipelineData {
  params: {};
  resources: {};
  workspaces: {};
}

export async function pipelineRunData(pipelineRunContent: TektonNode): Promise<TknResourceItem> {
  const pipelineRunData: TknResourceItem = {
    name: pipelineRunContent['item'].spec.pipelineRef.name,
    serviceAccount: undefined,
    pipelineResource: undefined,
    Secret: undefined,
    ConfigMap: undefined,
    PersistentVolumeClaim: undefined,
    PipelineRunName: pipelineRunContent.getName() ?? undefined,
    pipelineRun: {
      params: [],
      resources: [],
      workspaces: [],
      serviceAccount: undefined,
    },
    trigger: undefined,
    triggerLabel: undefined,
    triggerContent: undefined
  };
  const pipelineData = {
    params: {},
    resources: {},
    workspaces: {}
  }
  const getPipelineContent = await TektonItem.tkn.execute(Command.getPipeline(pipelineRunContent['item'].metadata.labels['tekton.dev/pipeline']), process.cwd(), false);
  let data: TknSpec;
  try {
    data = JSON.parse(getPipelineContent.stdout).spec;
  } catch (ignore) {
    // show no pipelines if output is not correct json
  }
  storePipelineParamData(data, pipelineData);
  storePipelineResourceData(data, pipelineData);
  storePipelineWorkspaceData(data, pipelineData);
  const getPipelineRunContent: TknPipelineRun = pipelineRunContent['item'].spec;
  filterPipelineRunParamContent(getPipelineRunContent, pipelineData, pipelineRunData);
  filterPipelineRunResourceContent(getPipelineRunContent, pipelineData, pipelineRunData);
  filterPipelineRunWorkspaceContent(getPipelineRunContent, pipelineData, pipelineRunData);
  if (pipelineRunContent['item'].spec.serviceAccountName) pipelineRunData.pipelineRun.serviceAccount = pipelineRunContent['item'].spec.serviceAccountName;
  if (pipelineRunContent['item'].spec.workspaces) await TektonItem.workspaceData(pipelineRunData);
  await TektonItem.pipelineResourcesList(pipelineRunData);
  return pipelineRunData;
}

function storePipelineParamData(data: TknSpec, pipelineData: PipelineData): void {
  if (data.params && data.params.length !== 0) {
    data.params.forEach((val) => {
      pipelineData.params[val.name] = {
        selected: false,
        name: val.name,
        default: val.default
      };
    })
  }
}

function storePipelineResourceData(data: TknSpec, pipelineData: PipelineData): void {
  if (data.resources && data.resources.length !== 0) {
    data.resources.forEach((val) => {
      pipelineData.resources[val.name] = {
        selected: false,
        name: val.name,
        type: val.type
      };
    })
  }
}

function storePipelineWorkspaceData(data: TknSpec, pipelineData: PipelineData): void {
  if (data.workspaces && data.workspaces.length !== 0) {
    data.workspaces.forEach((val) => {
      pipelineData.workspaces[val.name] = {
        selected: false
      };
    })
  }
}

function filterPipelineRunParamContent(getPipelineRunContent: TknPipelineRun, pipelineData: PipelineData, pipelineRunData: TknResourceItem): void {
  if (getPipelineRunContent.params && getPipelineRunContent.params.length !== 0) {
    getPipelineRunContent.params.forEach(val => {
      if (pipelineData.params[val.name]) {
        pipelineData.params[val.name].selected = true;
        pipelineRunData.pipelineRun.params.push(val);
      }
    });
    Object.keys(pipelineData.params).forEach(val => {
      if (!pipelineData.params[val].selected) {
        pipelineRunData.pipelineRun.params.push({
          name: pipelineData.params[val].name,
          value: pipelineData.params[val].default
        });
      }
    });
  }
}

function filterPipelineRunResourceContent(getPipelineRunContent: TknPipelineRun, pipelineData: PipelineData, pipelineRunData: TknResourceItem): void {
  if (getPipelineRunContent.resources && getPipelineRunContent.resources.length !== 0) {
    getPipelineRunContent.resources.forEach(val => {
      if (pipelineData.resources[val.name]) {
        pipelineData.resources[val.name].selected = true;
        pipelineRunData.pipelineRun.resources.push(val);
      }
    });
    Object.keys(pipelineData.resources).forEach(val => {
      if (!pipelineData.resources[val].selected) {
        pipelineRunData.pipelineRun.resources.push({
          name: pipelineData.resources[val].name,
          type: pipelineData.resources[val].type
        });
      }
    });
  }
}

function filterPipelineRunWorkspaceContent(getPipelineRunContent: TknPipelineRun, pipelineData: PipelineData, pipelineRunData: TknResourceItem): void {
  if (getPipelineRunContent.workspaces && getPipelineRunContent.workspaces.length !== 0) {
    getPipelineRunContent.workspaces.forEach(val => {
      if (pipelineData.workspaces[val.name]) {
        pipelineData.workspaces[val.name].selected = true;
        pipelineRunData.pipelineRun.workspaces.push(val);
      }
    });
    Object.keys(pipelineData.workspaces).forEach(val => {
      if (!pipelineData.workspaces[val].selected) {
        pipelineRunData.pipelineRun.workspaces.push({name: val});
      }
    });
  }
}
