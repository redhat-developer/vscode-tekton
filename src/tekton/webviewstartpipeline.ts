/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { Command } from '../tkn';
import { TektonItem } from './tektonitem';

export interface Param {
  name: string;
  type?: string;
}

export interface PipelineParam extends Param {
  default?: string | string[];
  description?: string;
}

export interface PipelineResource {
  name: string;
  type: string;
}

export interface PipelineWorkspace extends Param {
  type?: string;
  workspace?: string;
  data?: {
    [key: string]: string;
  };
}


export interface PipelineTaskRef {
  kind?: string;
  name: string;
}

export interface PipelineTaskParam {
  name: string;
  value: any;
}

export interface PipelineTaskResource {
  name: string;
  resource?: string;
  from?: string[];
}

export interface PipelineTaskResources {
  inputs?: PipelineTaskResource[];
  outputs?: PipelineTaskResource[];
}

export interface PipelineTask {
  name: string;
  runAfter?: string[];
  taskRef: PipelineTaskRef;
  params?: PipelineTaskParam[];
  resources?: PipelineTaskResources;
  workspaces?: PipelineWorkspace[];
}

interface TknResource {
  pipeline: {
    spec: {
      params?: PipelineParam[];
      resources?: PipelineResource[];
      workspaces?: PipelineWorkspace[];
      tasks: PipelineTask[];
      serviceAccountName?: string;
    };
  };
  pipelineResource: any;
  secret: any;
  configMap: any;
  pvc: any;
}


export const pipelineData = async (name: string) => {
  const pipelineData: TknResource = {
    pipeline: undefined,
    pipelineResource: undefined,
    secret: undefined,
    configMap: undefined,
    pvc: undefined
  };
  const pipeline = await TektonItem.tkn.execute(Command.getPipeline(name), process.cwd(), false);
  pipelineData.pipeline = JSON.parse(pipeline.stdout);
  if (pipelineData.pipeline.spec.workspaces) {
    const secret = await TektonItem.tkn.execute(Command.workspace('Secret'), process.cwd(), false);
    pipelineData.secret = [JSON.parse(secret.stdout)];
    const configMap = await TektonItem.tkn.execute(Command.workspace('ConfigMap'), process.cwd(), false);
    pipelineData.configMap = [JSON.parse(configMap.stdout)];
    const pvc = await TektonItem.tkn.execute(Command.workspace('PersistentVolumeClaim'), process.cwd(), false);
    pipelineData.pvc = [JSON.parse(pvc.stdout)];
  }
  const resource = await TektonItem.tkn.execute(Command.getPipelineResource(), process.cwd(), false);
  pipelineData.pipelineResource = JSON.parse(resource.stdout).items;
  return pipelineData;
}
