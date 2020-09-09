/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { V1ContainerState as ContainerState } from '@kubernetes/client-node';

//Contains set JSON representation of tkn JSON objects

export interface TknMetadata {
  name: string;
  generation?: number;
  namespace?: string;
  uid?: string;
  resourceVersion?: string;
}

export interface TknParams {
  name: string;
  value?: string;
  default?: string;
  description?: string;
}

export interface TknResource {
  name: string;
  type: string;
}

export interface TknSpec {
  type: string;
  resources?: TknResource[];
  params?: TknParams[];
  serviceAccount?: string;
  workspaces?: TknWorkspaces[];
}

export interface TknTaskSpec {
  inputs?: TknInputs;
  outputs?: TknOutputs;
  steps: Array;
}

export interface ParamSpec {
  name: string;
  type?: string;
  description?: string;
  default?: string | string[];
}

export interface TknInputs {
  resources?: TaskResource[];
  params?: ParamSpec[];
}

export interface TknOutputs {
  results?: {};
  resources?: TaskResource[];
}

export interface TaskResource {
  name: string;
  type: string;
  description?: string;
  targetPath?: string;
  optional?: boolean;
}

export interface TknWorkspaces {
  name: string;
}

export interface TknPipelineTrigger {
  metadata: TknMetadata;
  spec: TknSpec;
}

export interface TknPipelineResource {
  metadata: TknMetadata;
  spec: TknSpec;
}

export interface TknTask {
  kind: string;
  metadata: TknMetadata;
  spec: TknTaskSpec;
}

// JSON types

export interface Param {
  name: string;
}

export type VolumeTypeSecret = {
  secretName: string;
  items?: {
    key: string;
    path: string;
  }[];
};

export type VolumeTypeConfigMaps = {
  name: string;
  items?: {
    key: string;
    path: string;
  }[];
};

export interface PipelineRunParam extends Param {
  value?: string | string[];
  input?: string;
  output?: string;
  resource?: object;
  default?: string;
}

export type VolumeTypePVC = {
  claimName: string;
};

type PipelineRunResourceCommonProperties = {
  name: string;
};

export interface PipelineRunWorkspace extends Param {
  [volumeType: string]: VolumeTypeSecret | VolumeTypeConfigMaps | VolumeTypePVC | {};
}

export type PipelineRunReferenceResource = PipelineRunResourceCommonProperties & {
  name?: string;
  resourceRef?: string;
};

export type PipelineRunInlineResourceParam = { name: string; value: string };

export type PipelineRunInlineResource = PipelineRunResourceCommonProperties & {
  resourceSpec: {
    params: PipelineRunInlineResourceParam[];
    type: string;
  };
};

export type PipelineRunResource = PipelineRunReferenceResource | PipelineRunInlineResource;

export type PipelineRunData = {
  metadata?: {
    creationTimestamp: string;
    name: string;
    generateName: string;
  };
  spec?: {
    pipelineRef: {
      name: string;
    };
    params?: PipelineRunParam[];
    workspaces?: PipelineRunWorkspace[];
    resources?: PipelineRunResource[];
    serviceAccountName?: string;
  };
  status?: {
    succeededCondition?: string;
    creationTimestamp?: string;
    completionTime?: string;
    conditions?: PipelineRunConditions[];
    startTime?: string;
    completionTime?: string;
    taskRuns?: TaskRuns;
  };
};

export interface TaskRuns {
  [key: string]: TaskRun;
}

export interface ConditionCheckStatus {
  startTime?: string;
  completionTime?: string;
  check?: ContainerState;
  conditions?: PipelineRunConditions[];
}

export interface PipelineRunConditionCheckStatus {
  conditionName: string;
  status?: ConditionCheckStatus;
}

export interface PipelineRunConditionCheckStatusMap {
  [key: string]: PipelineRunConditionCheckStatus;
}

export interface TaskRun {
  pipelineTaskName: string;
  status: TaskRunStatus;
  conditionChecks?: PipelineRunConditionCheckStatusMap;
}

export interface TaskRunStatus {
  conditions: PipelineRunConditions[];
  startTime?: string;
  completionTime?: string;
  steps: TaskRunSteps[];
}

export interface PipelineRunConditions {
  message: string;
  reason: string;
  status: string;
  type: string;
}

export interface TaskRunSteps extends ContainerState {
  name: string;
  container: string;
}
