/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import * as _ from 'lodash';
import { PipelineRunData, TriggerTemplateKindParam, TriggerTemplateKind, EventListenerKind } from '../tekton';
import { TektonItem } from './tektonitem';
import { Command } from '../tkn';
import { AddTriggerFormValues, Pipeline, TriggerBindingKind, Resources } from './triggertype';
import { K8sKind } from './k8s-type';

export const TriggerTemplateModel = {
  apiGroup: 'triggers.tekton.dev',
  apiVersion: 'v1alpha1',
  label: 'Trigger Template',
  kind: 'TriggerTemplate',
  id: 'triggertemplate',
  labelPlural: 'Trigger Templates',
};

export const EventListenerModel: K8sKind = {
  apiGroup: 'triggers.tekton.dev',
  apiVersion: 'v1alpha1',
  label: 'Event Listener',
  kind: 'EventListener',
  id: 'eventlistener',
  labelPlural: 'Event Listeners',
};

export const PIPELINE_SERVICE_ACCOUNT = 'pipeline';

export async function addTrigger(inputAddTrigger: AddTriggerFormValues): Promise<string> {
  if (inputAddTrigger.resources.length !== 0) {
    restoreResource(inputAddTrigger.resources);
  }
  const triggerBinding = inputAddTrigger.trigger;
  const pipelineRun: PipelineRunData = await getPipelineRunFrom(inputAddTrigger);
  const triggerTemplateParams: TriggerTemplateKindParam[] = triggerBinding.resource.spec.params.map(
    ({ name }) => ({ name } as TriggerTemplateKindParam),
  );
  const triggerTemplate: TriggerTemplateKind = createTriggerTemplate(
    pipelineRun,
    triggerTemplateParams,
  );
  const eventListener: EventListenerKind = createEventListener(
    [triggerBinding.resource],
    triggerTemplate,
  );
  console.log(eventListener);
  return await '';
}

function restoreResource(resource: Resources[]): void {
  resource.map(val => {
    const referenceName: string = (typeof val.resourceRef === 'string') ? val.resourceRef : undefined;
    val.resourceRef = {
      name: referenceName
    }
  })
}

async function getPipelineRunFrom(inputAddTrigger: AddTriggerFormValues): Promise<PipelineRunData> {
  const pipelineRunData: PipelineRunData = {
    spec: {
      pipelineRef: {
        name: inputAddTrigger.name,
      },
      params: inputAddTrigger.params,
      resources: inputAddTrigger.resources
    },
  };
  return await getPipelineRunData(pipelineRunData);
}

function getRandomChars(len = 6): string {
  return Math.random()
    .toString(36)
    .replace(/[^a-z0-9]+/g, '')
    .substr(1, len);
}

async function getPipelineRunData(latestRun: PipelineRunData): Promise<PipelineRunData> {
  const pipelineData = await TektonItem.tkn.execute(Command.getPipeline(latestRun.spec.pipelineRef.name), process.cwd(), false);
  const pipeline: Pipeline = JSON.parse(pipelineData.stdout);
  const resources = latestRun?.spec.resources;
  const pipelineName = pipeline ? pipeline.metadata.name : undefined;
  const workspaces = latestRun?.spec.workspaces;
  const latestRunParams = latestRun?.spec.params;
  const params = latestRunParams;
  const newPipelineRun = {
    apiVersion: pipeline ? pipeline.apiVersion : undefined,
    kind: 'PipelineRun',
    metadata: {
      name: `${pipelineName}-${getRandomChars(6)}`,
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

function createTriggerTemplate(pipelineRun: PipelineRunData, params: TriggerTemplateKindParam[]): TriggerTemplateKind {
  return {
    apiVersion: apiVersionForModel(TriggerTemplateModel),
    kind: TriggerTemplateModel.kind,
    metadata: {
      name: `trigger-template-${pipelineRun.metadata.name}`,
    },
    spec: {
      params,
      resourcetemplates: [pipelineRun],
    },
  };
}

function apiVersionForModel(model: K8sKind): string {
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
