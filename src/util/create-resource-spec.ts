/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { Params, Workspace, VCT, Workspaces, Resources, Resource } from '../tekton';

export function getParams(params: Params[]): Params[] {
  if (params && params.length !== 0) {
    params.map(val => {
      val['value'] = val.default;
      delete val.default
    });
    return params;
  } else {
    return [];
  }
}

export function getPipelineRunResources(resources: Resources[]): Resources[] {
  const newResource = [];
  if (resources && resources.length !== 0) {
    resources.map(val => {
      newResource.push({name: val.name, resourceRef: { name: val.resourceRef}})
    })
  }
  return newResource;
}

export function getTaskRunResources(resources: Resources[]): Resource {
  const newResource: Resource = {};
  const inputsResource = [];
  const outputsResource = [];
  if (resources && resources.length !== 0) {
    resources.map(val => {
      if (val?.resourceType === 'inputs') {
        inputsResource.push({name: val.name, resourceRef: { name: val.resourceRef}})
      } else if (val?.resourceType === 'outputs') {
        outputsResource.push({name: val.name, resourceRef: { name: val.resourceRef}})
      }
    })
  }
  if (inputsResource && inputsResource.length !== 0) newResource.inputs = inputsResource;
  if (outputsResource && outputsResource.length !== 0) newResource.outputs = inputsResource;
  return newResource;
}

export function getWorkspaces(workspace: Workspaces[], volumeClaimTemplate: VCT[]): Workspace[] {
  const newWorkSpace = [];
  if (workspace && workspace.length !== 0) {
    workspace.map(value => {
      const workspaceObject = {};
      workspaceObject['name'] = value.name;
      if (value.workspaceType === 'Secret') {
        workspaceObject['secret'] = {
          items: value.item,
          secretName: value.workspaceName
        }
      } else if (value.workspaceType === 'ConfigMap') { 
        workspaceObject['configMap'] = {
          items: value.item,
          name: value.workspaceName
        }
      } else if (value.workspaceType === 'PersistentVolumeClaim') { 
        workspaceObject['persistentVolumeClaim'] = {
          claimName: value.workspaceName
        }
      } else if (value.workspaceType === 'EmptyDirectory') { 
        workspaceObject['emptyDir'] = {}
      }
      newWorkSpace.push(workspaceObject);
    })
  }
  if (volumeClaimTemplate && volumeClaimTemplate.length !== 0) {
    volumeClaimTemplate.map(value => {
      const workspaceObject = {};
      workspaceObject['name'] = value.metadata.name,
      workspaceObject[value.kind] = {
        spec: value.spec
      }
      newWorkSpace.push(workspaceObject);
    })
  }
  return newWorkSpace;
}
