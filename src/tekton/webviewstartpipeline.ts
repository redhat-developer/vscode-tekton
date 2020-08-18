/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/


import { Command } from '../tkn';
import { TektonItem } from './tektonitem';
import { TknPipelineTrigger, TknResource, TknParams, TknPipelineResource, TknWorkspaces } from '../tekton';

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
  pipelineRun?: {
    params: TknParams[];
    resources: TknResource[];
    workspaces: TknWorkspaces[];
  };
}

export async function pipelineData(pipeline: TknPipelineTrigger): Promise<TknResourceItem> {
  const pipelineData: TknResourceItem = {
    name: pipeline.metadata.name,
    resources: pipeline.spec.resources,
    params: pipeline.spec.params,
    workspaces: pipeline.spec.workspaces,
    serviceAccount: pipeline.spec.serviceAccount,
    pipelineResource: undefined,
    Secret: undefined,
    ConfigMap: undefined,
    PersistentVolumeClaim: undefined,
    pipelineRun: undefined
  };
  if (pipeline.spec.workspaces) await TektonItem.workspaceData(pipelineData);
  await TektonItem.pipelineResourcesList(pipelineData);
  return pipelineData;
}
