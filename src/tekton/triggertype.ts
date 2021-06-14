/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { VolumeTypeSecret, VolumeTypeConfigMaps, VolumeTypePVC, Workspace, Params, VCT, ItemPath } from '../tekton';

export interface TriggerFormValues {
  selectedTrigger: string;
}

export interface ObjectMetadata {
  annotations?: { [key: string]: string };
  clusterName?: string;
  creationTimestamp?: string;
  deletionGracePeriodSeconds?: number;
  deletionTimestamp?: string;
  generation?: number;
  labels?: { [key: string]: string };
  managedFields?: unknown[];
  name?: string;
  generateName?: string;
  Ref?: string;
  namespace?: string;
  resourceVersion?: string;
  selfLink?: string;
  uid?: string;
}

export interface TriggerBindingParam {
  name: string;
  value: string;
}

export interface Resources {
  name: string;
  resourceRef: string | {
    name: string;
  };
  resourceType?: string;
}

export interface K8sResourceCommon {
  apiVersion?: string;
  kind?: string;
  metadata?: ObjectMetadata;
}

export type TriggerBindingKind = K8sResourceCommon & {
  spec: {
    params: TriggerBindingParam[];
  };
};

export interface Param {
  name: string;
  default?: string;
  value?: string | string[];
}

export interface PipelineParam extends Param {
  description?: string;
}

export interface PipelineModalFormResource {
  name: string;
  resourceRef: string;
}

export interface CommonPipelineModalFormikValues {
  name: string;
  params: Params[] | undefined;
  resources: PipelineModalFormResource[];
  workspaces?: Workspace[];
  serviceAccount?: string;
}

export interface AddTriggerFormValues extends CommonPipelineModalFormikValues {
  trigger: {
    name: string;
    resource: TriggerBindingKind;
  };
  volumeClaimTemplate?: VCT[];
  commandId?: string;
}

export interface Workspaces {
  name?: string;
  workspaceName?: string;
  workspaceType?: string;
  item?: ItemPath[];
  subPath?: string;
  emptyDir?: string;
}

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

export interface K8sResourceKind extends K8sResourceCommon {
  status?: { [key: string]: unknown };
  type?: { [key: string]: unknown };
  data?: { [key: string]: unknown };
}

export interface Pipeline extends K8sResourceKind {
  spec: {
    params?: PipelineParam[];
    resources?: PipelineResource[];
    workspaces?: PipelineWorkspace[];
    serviceAccountName?: string;
  };
}
