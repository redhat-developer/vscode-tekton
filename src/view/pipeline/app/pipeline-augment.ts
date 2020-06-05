/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { Param } from './types';

export type MatchLabels = {
  [key: string]: string;
};

export type MatchExpression = {
  key: string;
  operator: 'Exists' | 'DoesNotExist' | 'In' | 'NotIn' | 'Equals' | 'NotEqual';
  values?: string[];
  value?: string;
};

export type Selector = {
  matchLabels?: MatchLabels;
  matchExpressions?: MatchExpression[];
};

export type OwnerReference = {
  name: string;
  kind: string;
  uid: string;
  apiVersion: string;
  controller?: boolean;
  blockOwnerDeletion?: boolean;
};

export type ObjectMetadata = {
  annotations?: { [key: string]: string };
  clusterName?: string;
  creationTimestamp?: string;
  deletionGracePeriodSeconds?: number;
  deletionTimestamp?: string;
  finalizers?: string[];
  generateName?: string;
  generation?: number;
  labels?: { [key: string]: string };
  managedFields?: unknown[];
  name?: string;
  namespace?: string;
  ownerReferences?: OwnerReference[];
  resourceVersion?: string;
  selfLink?: string;
  uid?: string;
};

export type K8sResourceCommon = {
  apiVersion?: string;
  kind?: string;
  metadata?: ObjectMetadata;
};

export type K8sResourceKind = K8sResourceCommon & {
  spec?: {
    selector?: Selector | MatchLabels;
    [key: string]: unknown;
  };
  status?: { [key: string]: unknown };
  type?: { [key: string]: unknown };
  data?: { [key: string]: unknown };
};

export interface PipelineRunParam extends Param {
  value: string | string[];
  input?: string;
  output?: string;
  resource?: object;
}

export interface PipelineRunWorkspace extends Param {
  [key: string]: string;
}

export type PipelineRunInlineResourceParam = {
  name: string;
  value: string;
};


type PipelineRunResourceCommonProperties = {
  name: string;
};

export type PipelineRunInlineResource = PipelineRunResourceCommonProperties & {
  resourceSpec: {
    params: PipelineRunInlineResourceParam[];
    type: string;
  };
};

export type PipelineRunReferenceResource = PipelineRunResourceCommonProperties & {
  resourceRef: {
    name: string;
  };
};

export type PipelineRunResource = PipelineRunReferenceResource | PipelineRunInlineResource;

export interface Condition {
  type: string;
  status: string;
  reason?: string;
  message?: string;
  lastTransitionTime?: string;
}

export type TaskRunKind = { pipelineTaskName?: string } & K8sResourceKind;


export interface TaskRuns {
  [key: string]: TaskRunKind;
}

export interface PipelineRun extends K8sResourceKind {
  spec?: {
    pipelineRef?: { name: string };
    params?: PipelineRunParam[];
    workspaces?: PipelineRunWorkspace[];
    resources?: PipelineRunResource[];
    serviceAccountName?: string;
    // Odd status value that only appears in a single case - cancelling a pipeline
    status?: 'PipelineRunCancelled';
    timeout?: string;
  };
  status?: {
    succeededCondition?: string;
    creationTimestamp?: string;
    conditions?: Condition[];
    startTime?: string;
    completionTime?: string;
    taskRuns?: TaskRuns;
  };
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
  type: string;
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
  value: unknown;
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
}

export interface Pipeline extends K8sResourceKind {
  latestRun?: PipelineRun;
  spec: {
    params?: PipelineParam[];
    resources?: PipelineResource[];
    workspaces?: PipelineWorkspace[];
    tasks: PipelineTask[];
    serviceAccountName?: string;
  };
}
