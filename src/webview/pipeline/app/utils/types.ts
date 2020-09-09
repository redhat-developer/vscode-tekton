/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

export interface ResourceRef {
  name: string;
}

export interface NameType {
  name: string;
  type?: string;
  resourceRef?: ResourceRef;
}

export interface ItemValue {
  key?: string;
  value?: string;
}

export interface Workspaces {
  name: string;
  workspaceName?: string;
  workspaceType?: string;
  item?: ItemValue[];
  subPath?: string;
  emptyDir?: string;
}

export interface Resources {
  name: string;
  resourceRef: string;
  resourceType?: string;
}

export interface Params {
  default?: string;
  description?: string;
  name: string;
  type?: string;
}

export interface PipelineRunParam {
  name: string;
  value: string;
  default?: string;
}

export interface PipelineRunResources {
  name: string;
  type?: string;
  resourceRef: {
    name: string;
  };
}

export interface PipelineRunWorkspacesItem {
  key: string;
  item: string;
}

export interface PipelineRunWorkspacesSecret {
  item: PipelineRunWorkspacesItem[];
  secretName: string;
}

export interface PipelineRunWorkspacesConfigMap {
  item: PipelineRunWorkspacesItem[];
  name: string;
}

export interface PipelineRunWorkspacesPVC {
  claimName: string;
}

export interface PipelineRunWorkspaces {
  name: string;
  configMap?: PipelineRunWorkspacesConfigMap[];
  secret?: PipelineRunWorkspacesSecret[];
  persistentVolumeClaim?: PipelineRunWorkspacesPVC[];
}

export interface TknMetadata {
  name: string;
  generation?: number;
  namespace?: string;
  uid?: string;
  resourceVersion?: string;
}

export interface TknResource {
  name: string;
  type: string;
}

export interface TknWorkspaces {
  name: string;
}

export interface TknSpec {
  type: string;
  resources?: NameType[];
  params?: Params[];
  serviceAccount?: string;
  workspaces?: TknWorkspaces[];
}

export interface TknPipelineResource {
  metadata: TknMetadata;
  spec: TknSpec;
}

export interface Trigger {
  name: string;
  resources: NameType[];
  params?: Params[];
  workspaces?: Workspaces[];
  serviceAcct: string | undefined;
  pipelineResource?: TknPipelineResource[];
  pipelineRun?: {
    params: PipelineRunParam[];
    resources: PipelineRunResources[];
    workspaces: PipelineRunWorkspaces[];
  };
}

export interface PipelineStart {
  name: string;
  resources: Resources[];
  params?: Params[];
  workspaces?: Workspaces[];
  trigger?: {
    name: string;
    resource: TriggerBindingKind;
  };
}

export interface Item {
  key: string;
  path: string;
}
