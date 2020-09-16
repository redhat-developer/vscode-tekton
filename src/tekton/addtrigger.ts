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
import { PipelineRunData, TriggerTemplateKindParam, TriggerTemplateKind, EventListenerKind } from '../tekton';
import { TektonItem } from './tektonitem';
import { Command, getStderrString } from '../tkn';
import { AddTriggerFormValues, Pipeline, TriggerBindingKind, Resources, Param } from './triggertype';
import { K8sKind, RouteKind } from './k8s-type';
import * as yaml from 'js-yaml';
import { Platform } from '../util/platform';
import { cli } from '../cli';
import { exposeRoute, RouteModel } from './expose';
import { Progress } from '../util/progress';

export const TriggerTemplateModel = {
  apiGroup: 'triggers.tekton.dev',
  apiVersion: 'v1alpha1',
  kind: 'TriggerTemplate',
};

export const EventListenerModel: K8sKind = {
  apiGroup: 'triggers.tekton.dev',
  apiVersion: 'v1alpha1',
  kind: 'EventListener',
};

export const PipelineRunModel: K8sKind = {
  apiGroup: 'tekton.dev',
  apiVersion: 'v1beta1',
  kind: 'PipelineRun',
};

export const PIPELINE_SERVICE_ACCOUNT = 'pipeline';

export function addTriggerToPipeline(inputAddTrigger: AddTriggerFormValues): Promise<string> {
  return Progress.execFunctionWithProgress('Adding Trigger.', () =>
    addTrigger(inputAddTrigger)
      .then(() => TektonItem.explorer.refresh())
      .catch((error) => Promise.reject(`Failed to Add Trigger '${error}'`))
  );
}

export async function addTrigger(inputAddTrigger: AddTriggerFormValues): Promise<void> {
  if (inputAddTrigger.resources.length !== 0) {
    restoreResource(inputAddTrigger.resources);
  }
  if (inputAddTrigger.params.length !== 0) {
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
  await k8sCreate(triggerTemplate);
  const eventListener: EventListenerKind = createEventListener(
    [triggerBinding.resource],
    triggerTemplate,
  );
  await k8sCreate(eventListener);
  await exposeRoute(eventListener.metadata.name);
}

export async function k8sCreate(trigger: TriggerTemplateKind | EventListenerKind | RouteKind): Promise<void> {
  const quote = Platform.OS === 'win32' ? '"' : '\'';
  const triggerYaml = yaml.safeDump(trigger, {skipInvalid: true});
  const tempPath = os.tmpdir();
  if (!tempPath) {
    return;
  }
  const fsPath = path.join(tempPath, trigger.metadata.name);
  await fs.writeFile(fsPath, triggerYaml, 'utf8');
  const result = await cli.execute(Command.create(`${quote}${fsPath}${quote}`));
  if (result.error) vscode.window.showErrorMessage(`Fail to deploy Resources: ${getStderrString(result.error)}`);
  if (trigger.kind === RouteModel.kind && !result.error) vscode.window.showInformationMessage('Trigger successfully created.');
}

function newParam(params: Param[]): void {
  params.map(val => {
    val.value = val.default
    delete val.default
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

async function getPipelineRunFrom(inputAddTrigger: AddTriggerFormValues, options?: { generateName: boolean }, labels?: { [key: string]: string },): Promise<PipelineRunData> {
  const pipelineRunData: PipelineRunData = {
    metadata: {
      labels,
    },
    spec: {
      pipelineRef: {
        name: inputAddTrigger.name,
      },
      params: inputAddTrigger.params,
      resources: inputAddTrigger.resources
    },
  };
  return await getPipelineRunData(pipelineRunData, options);
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

function createTriggerTemplate(pipelineRun: PipelineRunData, params: TriggerTemplateKindParam[], pipelineName?: string): TriggerTemplateKind {
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

function createEventListener(triggerBindings: TriggerBindingKind[], triggerTemplate: TriggerTemplateKind): EventListenerKind {
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
          bindings: triggerBindings.map(({ kind, metadata: { name } }) => ({ kind, name })),
          template: { name: triggerTemplate.metadata.name },
        },
      ],
    },
  };
}
