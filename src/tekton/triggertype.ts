/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { Params } from './pipelinecontent';
import { VolumeTypeSecret, VolumeTypeConfigMaps, VolumeTypePVC } from '../tekton';

export type TriggerFormValues = {
  selectedTrigger: string;
};

export type ObjectMetadata = {
  annotations?: { [key: string]: string };
  clusterName?: string;
  creationTimestamp?: string;
  deletionGracePeriodSeconds?: number;
  deletionTimestamp?: string;
  generateName?: string;
  generation?: number;
  labels?: { [key: string]: string };
  managedFields?: unknown[];
  name?: string;
  namespace?: string;
  resourceVersion?: string;
  selfLink?: string;
  uid?: string;
};

export type TriggerBindingParam = {
  name: string;
  value: string;
};

export interface Resources {
  name: string;
  resourceRef: string | {
    name: string;
  };
  resourceType?: string;
}

export type K8sResourceCommon = {
  apiVersion?: string;
  kind?: string;
  metadata?: ObjectMetadata;
};

export type TriggerBindingKind = K8sResourceCommon & {
  spec: {
    params: TriggerBindingParam[];
  };
};

export interface Param {
  name: string;
  default?: string | string[];
}

export interface PipelineParam extends Param {
  description?: string;
}

export type PipelineModalFormResource = {
  name: string;
  resourceRef: string;
};

export type CommonPipelineModalFormikValues = {
  name: string;
  params: Params[] | undefined;
  resources: PipelineModalFormResource[];
};


export type AddTriggerFormValues = CommonPipelineModalFormikValues & {
  trigger: {
    name: string;
    resource: TriggerBindingKind;
  };
};

export interface PipelineResource {
  name: string;
  type: string;
}

export interface PipelineWorkspace extends Param {
  type: string;
  data?: {
    [volumeType: string]: VolumeTypeSecret | VolumeTypeConfigMaps | VolumeTypePVC | {};
  };
}

export type K8sResourceKind = K8sResourceCommon & {
  status?: { [key: string]: unknown };
  type?: { [key: string]: unknown };
  data?: { [key: string]: unknown };
};

export interface Pipeline extends K8sResourceKind {
  spec: {
    params?: PipelineParam[];
    resources?: PipelineResource[];
    workspaces?: PipelineWorkspace[];
    serviceAccountName?: string;
  };
}
