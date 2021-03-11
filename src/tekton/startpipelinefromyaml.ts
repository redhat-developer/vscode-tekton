/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { window } from 'vscode';
import { cli } from '../cli';
import { PipelineRunWorkspace, TknPipelineTrigger } from '../tekton';
import { telemetryLogError } from '../telemetry';
import { Command } from '../tkn';
import { k8sCreate, PipelineRunModel } from './addtrigger';
import { PipelineRunKind } from './k8s-type';
import { Params, Resources, StartObject, VCT, Workspaces } from './pipelinecontent';

export async function startPipelineFromYaml(formValue: StartObject): Promise<void> {
  const pipelineRunJson = await getPipelineRun(formValue, formValue.commandId);
  await k8sCreate(pipelineRunJson, formValue.commandId, PipelineRunModel.kind);
}

export async function getPipelineRun(formValue: StartObject, commandId?: string): Promise<PipelineRunKind> {
  const pipelineRunData: PipelineRunKind = {
    metadata: {
    },
    spec: {
      pipelineRef: {
        name: formValue.name,
      },
      params: getPipelineRunParams(formValue.params),
      resources: getPipelineRunResources(formValue.resources),
      workspaces: getPipelineRunWorkspaces(formValue.workspaces, formValue.volumeClaimTemplate),
      serviceAccountName: formValue.serviceAccount
    },
  };
  const result = await cli.execute(Command.getPipeline(formValue.name));
  let pipeline: TknPipelineTrigger;
  if (result.error) {
    telemetryLogError(commandId, result.error.toString())
    window.showErrorMessage(`fail to fetch pipeline: ${result.error}`);
    return;
  }
  try {
    pipeline = JSON.parse(result.stdout);
  } catch (ignore) {
    //show no pipelines if output is not correct json
  }
  return getPipelineRunData(pipeline, pipelineRunData);
}

function getPipelineRunData(pipeline: TknPipelineTrigger, pipelineRunData: PipelineRunKind): PipelineRunKind {
  const pipelineName = pipeline.metadata.name;
  const resources = pipelineRunData?.spec.resources;
  const workspaces = pipelineRunData?.spec.workspaces;
  const params = pipelineRunData?.spec.params;
  const serviceAccountName = pipelineRunData?.spec.serviceAccountName;

  const newPipelineRun = {
    apiVersion: pipeline.apiVersion,
    kind: PipelineRunModel.kind,
    metadata: {
      generateName: `${pipelineName}-`,
      namespace: pipeline.metadata.namespace,
    },
    spec: {
      pipelineRef: {
        name: pipelineName,
      },
      resources,
      params,
      workspaces,
      status: null,
      serviceAccountName
    },
  };
  return newPipelineRun;
}

function getPipelineRunResources(resources: Resources[]): Resources[] {
  const newResource = [];
  if (resources && resources.length !== 0) {
    resources.map(val => {
      newResource.push({name: val.name, resourceRef: { name: val.resourceRef}})
    })
  }
  return newResource;
}

function getPipelineRunParams(params: Params[]): Params[] {
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

function getPipelineRunWorkspaces(workspace: Workspaces[], volumeClaimTemplate: VCT[]): PipelineRunWorkspace[] {
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
        workspaceObject['persistentVolumeClaim'] = {
          claimName: value.workspaceName,
          emptyDir: {}
        }
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
