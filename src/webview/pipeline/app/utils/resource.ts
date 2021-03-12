/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { PipelineStart, Trigger } from './types';

export function collectParameterData(paramName: string, defaultValue: string, initialValue: PipelineStart): void {
  initialValue.params.push({name: paramName, default: defaultValue});
}

export function collectServiceAccountData(name: string, initialValue: PipelineStart): void {
  initialValue.serviceAccount = name;
}

export function collectResourceData(resourceName: string, resourceReference: string, initialValue: PipelineStart): void {
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

export function collectWorkspaceData(resourceName: string, workspaceResourceType: string, initialValue: PipelineStart, workspaceResourceName?: string): void {
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

export function addItemInWorkspace(resourceName: string, keyValue: string, pathName: string, initialValue: PipelineStart): void {
  initialValue.workspaces.some(resource => {
    if (resource.name === resourceName) {
      resource.item.push({key: keyValue, path: pathName});
    }
  });
}

export function collectTriggerData(triggerName: string, initialValue: PipelineStart, trigger: Trigger): void {
  initialValue.trigger = {name: triggerName, resource: trigger.triggerContent[triggerName].resource};
}

export function createPVC(name: string, accessMode: string, size: string, inputSize: string, initialValue: PipelineStart): void {
  initialValue.newPvc.push({
    apiVersion: 'v1',
    kind: 'PersistentVolumeClaim',
    metadata: {
      name: name
    },
    spec: {
      resources: {
        requests: {
          storage: `${inputSize}${size}`
        }
      },
      volumeMode: 'Filesystem',
      accessModes: [accessMode]
    }
  });
}

export function removePvcName(name: string, initialValue: PipelineStart): void {
  const newWorkSpace = initialValue.workspaces.filter((value) => value.name !== name);
  initialValue.workspaces = newWorkSpace;
}

export function createVCT(name: string, accessMode: string, size: string, inputSize: string, initialValue: PipelineStart): void {
  initialValue.volumeClaimTemplate.push({
    kind: 'volumeClaimTemplate',
    metadata: {
      name: name
    },
    spec: {
      resources: {
        requests: {
          storage: `${inputSize}${size}`
        }
      },
      accessModes: [accessMode]
    }
  });
}


export function storePvcName(name: string, workspaceName: string, initialValue: PipelineStart): void {
  initialValue.workspaces.forEach(val => {
    if (val.name === name) {
      val.workspaceName = workspaceName;
    }
  })
}
