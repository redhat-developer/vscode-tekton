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

interface Secret {
  data: string[];
  kind: string;
  metadata: KubectlMetadata;
}

interface ConfigMap {
  data: string[];
  kind: string;
  metadata: KubectlMetadata;
}

interface PVC {
  metadata: KubectlMetadata;
}

export interface TknResourceItem {
  name: string;
  resources: TknResource[];
  params: TknParams[];
  workspaces: TknWorkspaces[];
  serviceAcct: string;
  pipelineResource: TknPipelineResource;
  Secret: Secret[];
  ConfigMap: ConfigMap[];
  PersistentVolumeClaim: PVC[];
}

export async function pipelineData(pipeline: TknPipelineTrigger): Promise<TknResourceItem> {
  const pipelineData: TknResourceItem = {
    name: pipeline.metadata.name,
    resources: pipeline.spec.resources,
    params: pipeline.spec.params,
    workspaces: pipeline.spec['workspaces'],
    serviceAcct: pipeline.spec.serviceAccount,
    pipelineResource: undefined,
    Secret: undefined,
    ConfigMap: undefined,
    PersistentVolumeClaim: undefined
  };
  if (pipeline.spec.workspaces) {
    const secret = await TektonItem.tkn.execute(Command.workspace('Secret'), process.cwd(), false);
    pipelineData.Secret = JSON.parse(secret.stdout).items;
    const configMap = await TektonItem.tkn.execute(Command.workspace('ConfigMap'), process.cwd(), false);
    pipelineData.ConfigMap = JSON.parse(configMap.stdout).items;
    const pvc = await TektonItem.tkn.execute(Command.workspace('PersistentVolumeClaim'), process.cwd(), false);
    pipelineData.PersistentVolumeClaim = JSON.parse(pvc.stdout).items;
  }
  const resource = await TektonItem.tkn.execute(Command.getPipelineResource(), process.cwd(), false);
  pipelineData.pipelineResource = JSON.parse(resource.stdout).items;
  return pipelineData;
}
