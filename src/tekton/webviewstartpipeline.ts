/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { TektonItem } from './tektonitem';
import { TknPipelineTrigger, TknResource, TknParams, TknPipelineResource, TknWorkspaces } from '../tekton';
import { Command } from '../util/command';

interface KubectlMetadata {
  name: string;
}

export interface Secret {
  data: string[];
  kind: string;
  metadata: KubectlMetadata;
}

export interface ConfigMap {
  data: string[];
  kind: string;
  metadata: KubectlMetadata;
}

export interface PVC {
  metadata: KubectlMetadata;
}

export interface Trigger {
  name: string;
  label: string;
}

export interface TriggerLabel {
  name: string;
}

export interface TknPipelineRun {
  params: TknParams[];
  resources: TknResource[];
  workspaces: TknWorkspaces[];
  serviceAccount?: string;
}

export interface TknResourceItem {
  name: string;
  resources?: TknResource[];
  params?: TknParams[];
  workspaces?: TknWorkspaces[];
  serviceAccount: string;
  pipelineResource: TknPipelineResource[];
  Secret: Secret[];
  ConfigMap: ConfigMap[];
  PersistentVolumeClaim: PVC[];
  trigger: Trigger[];
  triggerLabel: TriggerLabel[];
  triggerContent: object;
  PipelineRunName?: string;
  pipelineRun?: TknPipelineRun;
  commandId?: string;
}

export async function pipelineData(pipeline: TknPipelineTrigger, trigger?: boolean | undefined): Promise<TknResourceItem> {
  const pipelineData: TknResourceItem = {
    name: pipeline.metadata.name,
    resources: pipeline.spec.resources,
    params: pipeline.spec.params,
    workspaces: pipeline.spec.workspaces,
    serviceAccount: 'Start-Pipeline',
    pipelineResource: undefined,
    Secret: undefined,
    ConfigMap: undefined,
    PersistentVolumeClaim: undefined,
    pipelineRun: undefined,
    trigger: undefined,
    triggerLabel: [{
      name: 'Git Provider Type'
    }],
    triggerContent: undefined
  };
  if (pipeline.spec.workspaces) await TektonItem.workspaceData(pipelineData);
  if (trigger) {
    await addTrigger(pipelineData);
  }
  await TektonItem.pipelineResourcesList(pipelineData);
  return pipelineData;
}

async function addTrigger(pipelineData: TknResourceItem): Promise<void> {
  const binding = {};
  const webHook = [];
  const triggerBinding = await TektonItem.tkn.execute(Command.listTriggerBinding(), process.cwd(), false);
  const listTriggerBinding = JSON.parse(triggerBinding.stdout).items;
  const clusterTriggerBinding = await TektonItem.tkn.execute(Command.listClusterTriggerBinding(), process.cwd(), false);
  const listClusterTriggerBinding = JSON.parse(clusterTriggerBinding.stdout).items;
  if (listTriggerBinding.length !== 0) {
    listTriggerBinding.forEach(element => {
      if (!binding[element.metadata.name]) {
        binding[element.metadata.name] = { resource: element };
        webHook.push({name: element.metadata.name, label: element.metadata.name, resource: element});
      }
    });
  }
  if (listClusterTriggerBinding.length !== 0) {
    listClusterTriggerBinding.forEach(element => {
      if (!binding[element.metadata.name]) {
        binding[element.metadata.name] = { resource: element };
        webHook.push({name: element.metadata.name, label: element.metadata.name, resource: element});
      }
    });
  }
  pipelineData.triggerContent = binding;
  pipelineData.trigger = webHook;
}
