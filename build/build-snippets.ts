/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/
import * as path from 'path';
import * as fs from 'fs-extra';

interface Snippet {
  prefix: string;
  description: string;
  body: string[];
}

const snippets: { [key: string]: Snippet } = {
  'Resource Limits and Requests': {
    prefix: 'Tekton: K8s Limits',
    description: 'Defines the Kubernetes resource limits and requests',
    body: load('k8s-limits.yaml'),
  },
  'Task': {
    prefix: 'Tekton: Task',
    description: 'Create a Tekton Task Resource',
    body: load('task.yaml'),
  },
  'TaskRun': {
    prefix: 'Tekton: TaskRun',
    description: 'Create a Tekton TaskRun Resource',
    body: load('taskrun.yaml'),
  },
  'Pipeline': {
    prefix: 'Tekton: Pipeline',
    description: 'Create a Tekton Pipeline Resource',
    body: load('pipeline.yaml'),
  },
  'PipelineRun': {
    prefix: 'Tekton: PipelineRun',
    description: 'Create a Tekton PipelineRun Resource',
    body: load('pipelinerun.yaml'),
  },
  'ClusterTask': {
    prefix: 'Tekton: ClusterTask',
    description: 'Create a ClusterTask Resource',
    body: load('clustertask.yaml'),
  },
  'Condition': {
    prefix: 'Tekton: Condition',
    description: 'Create a Condition Resource',
    body: load('condition.yaml')
  },
  'PipelineResource': {
    prefix: 'Tekton: PipelineResource',
    description: 'Create a PipelineResource Resource',
    body: load('pipelineResource.yaml'),
  },
  'TriggerTemplate': {
    prefix: 'Tekton: TriggerTemplate',
    description: 'Create a TriggerTemplate Resource',
    body: load('triggertemplate.yaml')
  },
  'TriggerBinding': {
    prefix: 'Tekton: TriggerBinding',
    description: 'Create a TriggerBinding Resource',
    body: load('triggerbinding.yaml')
  },
  'ClusterTriggerBinding': {
    prefix: 'Tekton: ClusterTriggerBinding',
    description: 'Create a ClusterTriggerBinding Resource',
    body: load('cluster-triggerbinding.yaml')
  },
  'EventListener': {
    prefix: 'Tekton: EventListener',
    description: 'Create an EventListener Resource',
    body: load('EventListener.yaml')
  },
  'PipelineResource Type': {
    prefix: 'Tekton: PipelineResourceType',
    description: 'Create a PipelineResource Type Resource',
    body: load('pipelineResourceType.yaml'),
  },
  'Pipeline Task Reference': {
    prefix: 'Tekton: PipelineTaskReference',
    description: 'Tekton Pipeline Task Reference',
    body: load('pipelineTaskReference.yaml'),
  },
  'Pipeline Task Reference Input': {
    prefix: 'Tekton: PipelineTaskReferenceInput',
    description: 'Tekton Pipeline Task Reference Inputs, Parameters and Outputs',
    body: load('pipelineTaskReferenceInputs.yaml'),
  },
  'Pipeline Task Conditions': {
    prefix: 'Tekton: PipelineTaskConditions',
    description: 'Tekton Pipeline Task Conditions',
    body: load('pipelineTaskCondition.yaml')
  },
  'TaskStep': {
    prefix: 'Tekton: TaskStep',
    description: 'Tekton Task Step',
    body: load('tektonTaskStep.yaml'),
  },
  'Param': {
    prefix: 'Tekton: Parameter',
    description: 'A generic parameter used across any YAML that are key/value pair',
    body: load('tektonParameter.yaml'),
  },
  'Task Input': {
    prefix: 'Tekton: TaskInput',
    description: 'Tekton Task Inputs, Parameters and Outputs',
    body: load('taskinput.yaml'),
  },
  'Task Param': {
    prefix: 'Tekton: TaskParameter',
    description: 'Tekton Pipeline Task Parameter',
    body: load('tektonTaskParameter.yaml'),
  },
}

function load(name: string): string[] {
  const filePath = path.join(__dirname, '..', '..', 'rawsnippets', name);
  const lines = fs.readFileSync(filePath).toString().split('\n');
  if (lines[lines.length - 1] === '') {
    lines.pop();
  }
  return lines;
}

const out = JSON.stringify(snippets, undefined, 2);

const filePath = path.join(__dirname, '..', '..', 'snippets', 'tekton.json');
fs.writeFileSync(filePath, out);
