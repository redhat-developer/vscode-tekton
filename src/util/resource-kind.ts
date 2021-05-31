/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { K8sKind } from '../tekton/k8s-type';

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

export const TaskRunModel: K8sKind = {
  apiGroup: 'tekton.dev',
  apiVersion: 'v1beta1',
  kind: 'TaskRun',
};
