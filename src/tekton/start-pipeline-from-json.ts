/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { window } from 'vscode';
import { Command } from '../cli-command';
import { StartObject, TknPipelineTrigger } from '../tekton';
import { telemetryLogError } from '../telemetry';
import { tkn } from '../tkn';
import { getParams, getPipelineRunResources, getWorkspaces } from '../util/create-resource-spec';
import { PipelineRunModel } from '../util/resource-kind';
import { k8sCreate } from './addtrigger';
import { PipelineRunKind } from './k8s-type';

export async function startPipelineFromJson(formValue: StartObject): Promise<void> {
  const pipelineRunJson = await getPipelineRun(formValue, formValue.commandId);
  if (!pipelineRunJson) return null;
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
      params: getParams(formValue.params),
      resources: getPipelineRunResources(formValue.resources),
      workspaces: getWorkspaces(formValue.workspaces, formValue.volumeClaimTemplate),
      serviceAccountName: formValue.serviceAccount
    },
  };
  const result = await tkn.execute(Command.getPipeline(formValue.name));
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
