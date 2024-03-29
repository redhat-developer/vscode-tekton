/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

//copy from https://github.com/openshift/console/blob/master/frontend/packages/dev-console/src/components/pipelines/modals/triggers/submit-utils.ts 

import * as _ from 'lodash';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import * as fs from 'fs-extra';
import { PipelineRunData, TriggerTemplateKindParam, TriggerTemplateKind, EventListenerKind, Workspace, VCT, TknTaskRun } from '../tekton';
import { TektonItem } from './tektonitem';
import { AddTriggerFormValues, Pipeline, TriggerBindingKind, Resources, Param, Workspaces } from './triggertype';
import { K8sKind, PipelineRunKind, RouteKind } from './k8s-type';
import * as yaml from 'js-yaml';
import { Platform } from '../util/platform';
import { exposeRoute, RouteModel } from './expose';
import { Progress } from '../util/progress';
import { TknVersion, version } from '../util/tknversion';
import { NewPvc } from './create-resources';
import { getExposeURl } from '../util/exposeurl';
import { telemetryLog, telemetryLogError } from '../telemetry';
import { getStderrString } from '../util/stderrstring';
import { Command } from '../cli-command';
import semver = require('semver');
import { ClusterTaskModel, EventListenerModel, PipelineRunModel, TaskModel, TriggerTemplateModel } from '../util/resource-kind';
import { showPipelineRunPreview } from '../pipeline/pipeline-preview';
import { PipelineRun } from './pipelinerun';
import { tkn } from '../tkn';

export enum WorkspaceResource {
  Secret = 'secret',
  ConfigMap = 'configMap',
  PersistentVolumeClaim = 'persistentVolumeClaim',
  EmptyDirectory = 'emptyDir'
}

export const PIPELINE_SERVICE_ACCOUNT = 'pipeline';

export function addTriggerToPipeline(inputAddTrigger: AddTriggerFormValues): Promise<string> {
  return Progress.execFunctionWithProgress('Adding Trigger.', () =>
    addTrigger(inputAddTrigger)
      .then(() => TektonItem.explorer.refresh())
      .catch((error) => Promise.reject(`Failed to Add Trigger '${error}'`))
  );
}

export async function addTrigger(inputAddTrigger: AddTriggerFormValues): Promise<void> {
  if (inputAddTrigger.resources && inputAddTrigger.resources.length !== 0) {
    restoreResource(inputAddTrigger.resources);
  }
  if (inputAddTrigger.params && inputAddTrigger.params.length !== 0) {
    newParam(inputAddTrigger.params);
  }
  const triggerBinding = inputAddTrigger.trigger;
  const pipelineRun: PipelineRunData = await getPipelineRunFrom(inputAddTrigger, { generateName: true }, {}); //
  const triggerTemplateParams: TriggerTemplateKindParam[] = triggerBinding.resource.spec.params.map(
    ({ name }) => ({ name } as TriggerTemplateKindParam),
  );
  const triggerTemplate: TriggerTemplateKind = createTriggerTemplate(
    pipelineRun,
    triggerTemplateParams,
    inputAddTrigger.name
  );
  const createTt = await k8sCreate(triggerTemplate, inputAddTrigger.commandId);
  if (!createTt) return null;
  const eventListener: EventListenerKind = await createEventListener(
    [triggerBinding.resource],
    triggerTemplate,
  );
  const createEt = await k8sCreate(eventListener, inputAddTrigger.commandId);
  if (!createEt) return null;
  await exposeRoute(eventListener.metadata.name, inputAddTrigger.commandId);
}

export async function k8sCreate(trigger: TriggerTemplateKind | EventListenerKind | RouteKind | NewPvc | PipelineRunKind | TknTaskRun, commandId?: string, kind?: string): Promise<boolean> {
  const quote = Platform.OS === 'win32' ? '"' : '\'';
  const triggerYaml = yaml.safeDump(trigger, {skipInvalid: true});
  const tempPath = os.tmpdir();
  if (!tempPath) {
    return false;
  }
  const fsPath = path.join(tempPath, `${trigger.metadata.name || trigger.metadata.generateName}.yaml`);
  await fs.writeFile(fsPath, triggerYaml, 'utf8');
  const result = await tkn.execute(Command.create(`${quote}${fsPath}${quote}`));
  if (result.error) {
    telemetryLogError(commandId, result.error.toString().replace(fsPath, 'user path'));
    vscode.window.showErrorMessage(`Fail to deploy Resources: ${getStderrString(result.error)}`);
    return false;
  }
  if (trigger.kind === RouteModel.kind && !result.error) {
    const url = await getExposeURl(trigger.metadata.name);
    telemetryLog(commandId, 'Trigger successfully created');
    vscode.window.showInformationMessage(`Trigger successfully created. Expose URL: ${url}`);
  }
  if (kind === PipelineRunModel.kind && !result.error) {
    const message = 'Pipeline successfully started';
    telemetryLog(commandId, message);
    if (TektonItem.ShowPipelineRun()) {
      const pipelineRunNameRegex = new RegExp(`${trigger.metadata.generateName}\\w*`);
      const pipelineRunName = result.stdout.match(pipelineRunNameRegex)[0];
      if (pipelineRunName) {
        await showPipelineRunPreview(pipelineRunName);
        if (vscode.workspace.getConfiguration('vs-tekton').get('showLogsOnPipelineStart')) PipelineRun.pipelineRunFollowLogs(pipelineRunName);
      }
    }
    vscode.window.showInformationMessage(message);
  }
  if ((kind === TaskModel.kind || kind === ClusterTaskModel.kind) && !result.error) {
    const message = `${kind} successfully started`;
    telemetryLog(commandId, message);
    vscode.window.showInformationMessage(message);
  }
  await fs.unlink(fsPath);
  return true;
}

function newParam(params: Param[]): void {
  params.map(val => {
    val.value = val.default
    delete val.default
    delete val?.type
  })
}

function restoreResource(resource: Resources[]): void {
  resource.map(val => {
    const referenceName: string = (typeof val.resourceRef === 'string') ? val.resourceRef : undefined;
    val.resourceRef = {
      name: referenceName
    }
  })
}

export async function getPipelineRunFrom(inputAddTrigger: AddTriggerFormValues, options?: { generateName: boolean }, labels?: { [key: string]: string },): Promise<PipelineRunData> {
  const pipelineRunData: PipelineRunData = {
    metadata: {
      labels,
    },
    spec: {
      pipelineRef: {
        name: inputAddTrigger.name,
      },
      params: inputAddTrigger.params,
      resources: inputAddTrigger.resources,
      workspaces: getPipelineRunWorkspaces(inputAddTrigger.workspaces, inputAddTrigger.volumeClaimTemplate),
    },
  };
  if (inputAddTrigger?.serviceAccount?.trim()) {
    pipelineRunData.spec.serviceAccountName = inputAddTrigger.serviceAccount;
  }
  return await getPipelineRunData(pipelineRunData, options);
}

export function getPipelineRunWorkspaces(workspaces: Workspaces[], volumeClaimTemplate?: VCT[]): Workspace[] {
  const newWorkspace = [];
  if (workspaces && workspaces.length !== 0) {
    workspaces.map((workspaceData: Workspaces) => {
      const newWorkspaceObject = {};
      const workspaceResourceObject = {};
      newWorkspaceObject['name'] = workspaceData.name;
      if (WorkspaceResource[workspaceData.workspaceType] === WorkspaceResource.Secret) {
        workspaceResourceObject['secretName'] = workspaceData.workspaceName;
      } else if (WorkspaceResource[workspaceData.workspaceType] === WorkspaceResource.ConfigMap) {
        workspaceResourceObject['name'] = workspaceData.workspaceName;
      } else if (WorkspaceResource[workspaceData.workspaceType] === WorkspaceResource.PersistentVolumeClaim) {
        workspaceResourceObject['claimName'] = workspaceData.workspaceName;
      } else if (WorkspaceResource[workspaceData.workspaceType] === WorkspaceResource.EmptyDirectory) {
        workspaceResourceObject['emptyDir']
      }
      if (workspaceData.item && workspaceData.item.length !== 0) {
        workspaceResourceObject['items'] = workspaceData.item;
      }
      newWorkspaceObject[WorkspaceResource[workspaceData.workspaceType]] = workspaceResourceObject;
      newWorkspace.push(newWorkspaceObject);
    });
  }
  if (volumeClaimTemplate && volumeClaimTemplate.length !== 0) {
    volumeClaimTemplate.map(value => {
      const workspaceObject = {};
      workspaceObject['name'] = value.metadata.name,
      workspaceObject[value.kind] = {
        spec: value.spec
      }
      workspaceObject[value.kind].spec.volumeMode = 'Filesystem';
      newWorkspace.push(workspaceObject);
    })
  }
  return newWorkspace;
}

function getRandomChars(len = 6): string {
  return Math.random()
    .toString(36)
    .replace(/[^a-z0-9]+/g, '')
    .substr(1, len);
}

async function getPipelineRunData(latestRun: PipelineRunData, options?: { generateName: boolean }): Promise<PipelineRunData> {
  const pipelineData = await TektonItem.tkn.execute(Command.getPipeline(latestRun.spec.pipelineRef.name), process.cwd(), false);
  const pipeline: Pipeline = JSON.parse(pipelineData.stdout);
  const resources = latestRun?.spec.resources;
  const pipelineName = pipeline ? pipeline.metadata.name : latestRun.spec.pipelineRef.name;
  const workspaces = latestRun?.spec.workspaces;
  const latestRunParams = latestRun?.spec.params;
  const params = latestRunParams;
  const newPipelineRun = {
    apiVersion: pipeline ? pipeline.apiVersion : latestRun.apiVersion,
    kind: PipelineRunModel.kind,
    metadata: {
      ...(options?.generateName
        ? {
          generateName: `${pipelineName}-`,
        }
        : {
          name: `${pipelineName}-${getRandomChars()}`,
        }),
      // namespace: pipeline ? pipeline.metadata.namespace : latestRun.metadata.namespace,
      labels: _.merge({}, pipeline?.metadata?.labels, latestRun?.metadata?.labels, {
        'tekton.dev/pipeline': pipelineName,
      }),
    },
    spec: {
      ...(latestRun?.spec || {}),
      pipelineRef: {
        name: pipelineName,
      },
      resources,
      ...(params && { params }),
      workspaces,
      status: null,
    },
  };
  return migratePipelineRun(newPipelineRun);
}

function migratePipelineRun(pipelineRun: PipelineRunData): PipelineRunData {
  let newPipelineRun = pipelineRun;

  const serviceAccountPath = 'spec.serviceAccount';
  if (_.has(newPipelineRun, serviceAccountPath)) {
    // .spec.serviceAccount was removed for .spec.serviceAccountName in 0.9.x
    // Note: apiVersion was not updated for this change and thus we cannot gate this change behind a version number
    const serviceAccountName = _.get(newPipelineRun, serviceAccountPath);
    newPipelineRun = _.omit(newPipelineRun, [serviceAccountPath]);
    newPipelineRun = _.merge(newPipelineRun, {
      spec: {
        serviceAccountName,
      },
    });
  }

  return newPipelineRun;
}

export function createTriggerTemplate(pipelineRun: PipelineRunData, params: TriggerTemplateKindParam[], pipelineName?: string): TriggerTemplateKind {
  return {
    apiVersion: apiVersionForModel(TriggerTemplateModel),
    kind: TriggerTemplateModel.kind,
    metadata: {
      name: `trigger-template-${pipelineName}-${getRandomChars()}`,
    },
    spec: {
      params,
      resourcetemplates: [pipelineRun],
    },
  };
}

export function apiVersionForModel(model: K8sKind): string {
  return _.isEmpty(model.apiGroup) ? model.apiVersion : `${model.apiGroup}/${model.apiVersion}`;
}

export async function createEventListener(triggerBindings: TriggerBindingKind[], triggerTemplate: TriggerTemplateKind): Promise<EventListenerKind> {
  const getNewELSupport: TknVersion = await version();
  const compareVersion = semver.satisfies('0.5.0', `>=${getNewELSupport.trigger}`);
  return {
    apiVersion: apiVersionForModel(EventListenerModel),
    kind: EventListenerModel.kind,
    metadata: {
      name: `event-listener-${getRandomChars()}`,
    },
    spec: {
      serviceAccountName: PIPELINE_SERVICE_ACCOUNT,
      triggers: [
        {
          bindings: triggerBindings.map(({ kind, metadata: { name } }) => {
            if (compareVersion) {
              return ({ kind, name });
            } else {
              const Ref = name;
              return ({ kind, Ref });
            }
          }),
          template: compareVersion ? { name: triggerTemplate.metadata.name } : { ref: triggerTemplate.metadata.name },
        },
      ],
    },
  };
}
