/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { PipelineStart } from './types';


export function parameter(paramName: string, defaultValue: string, initialValue: PipelineStart): void {
  if (initialValue.params.length === 0) {
    initialValue.params.push({name: paramName, default: defaultValue});
  } else {
    const found = initialValue.params.some(value => {
      if (value.name === paramName) {
        value.default = defaultValue;
        return true;
      }
    });
    if (!found) {
      initialValue.params.push({name: paramName, default: defaultValue});
    }
  }
}

export function createResourceJson(resourceName: string, resourceReference: string, initialValue: PipelineStart): void {
  if (initialValue.resources.length === 0) {
    initialValue.resources.push({name: resourceName, resourceRef: resourceReference});
  } else {
    const found = initialValue.resources.some(value => {
      if (value.name === resourceName) {
        value.resourceRef = resourceReference;
        return true;
      }
    });
    if (!found) {
      initialValue.resources.push({name: resourceName, resourceRef: resourceReference});
    }
  }
}

export function createWorkspaceJson(resourceName: string, workspaceResourceType: string, initialValue: PipelineStart, workspaceResourceName?: string, keyName?: string, valueName?: string): void {
  const itemData = [];
  if (initialValue.workspaces.length === 0) {
    initialValue.workspaces.push({
      name: resourceName,
      workspaceType: workspaceResourceType,
      workspaceName: workspaceResourceName,
      item: itemData
    });
  } else {
    const found = initialValue.workspaces.some(value => {
      if (value.name === resourceName) {
        if (!workspaceResourceName) value.workspaceType = workspaceResourceType;
        value.workspaceName = workspaceResourceName;
        value.item = itemData;
        return true;
      }
    });
    if (!found) {
      initialValue.workspaces.push({
        name: resourceName,
        workspaceType: workspaceResourceType,
        workspaceName: workspaceResourceName,
        item: itemData
      });
    }
  }
}
