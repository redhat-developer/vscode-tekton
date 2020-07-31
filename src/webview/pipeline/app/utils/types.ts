/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

export interface NameType {
  name: string;
  type?: string;
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

export interface Trigger {
  name: string;
  resources: NameType[];
  params?: Params[];
  workspaces?: Workspaces[];
  serviceAcct: string | undefined;
  pipelineResource?: string[];
}

export interface PipelineStart {
  name: string;
  resources: Resources[];
  params?: Params[];
  workspaces?: Workspaces[];
}
