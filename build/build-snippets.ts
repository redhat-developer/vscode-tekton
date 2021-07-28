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
    prefix: 'K8s Limits',
    description: 'Defines the Kubernetes resource limits and requests',
    body: load('k8s-limits.yaml'),
  },
  'Task': {
    prefix: 'Task',
    description: 'Create a Tekton Task Resource',
    body: load('task.yaml'),
  },
  'TaskRun': {
    prefix: 'TaskRun',
    description: 'Create a Tekton TaskRun Resource',
    body: load('taskrun.yaml'),
  },
  'Pipeline': {
    prefix: 'Pipeline',
    description: 'Create a Tekton Pipeline Resource',
    body: load('pipeline.yaml'),
  },
  'Pipeline-finally': {
    prefix: 'Pipeline-with-finally',
    description: 'Create a Tekton Pipeline Resource with finally in spec',
    body: load('pipeline-finally.yaml'),
  },
  'Pipeline-with-multiple-task': {
    prefix: 'Pipeline-with-multiple-task',
    description: 'Create a Tekton Pipeline Resource with at least three task in spec',
    body: load('pipeline-with-multiple-task.yaml'),
  },
  'Pipeline-condition': {
    prefix: 'Pipeline-with-condition',
    description: 'Create a Tekton Pipeline Resource with condition in spec',
    body: load('pipeline-condition.yaml'),
  },
  'PipelineRun': {
    prefix: 'PipelineRun',
    description: 'Create a Tekton PipelineRun Resource',
    body: load('pipelinerun.yaml'),
  },
  'ClusterTask': {
    prefix: 'ClusterTask',
    description: 'Create a ClusterTask Resource',
    body: load('clustertask.yaml'),
  },
  'Condition': {
    prefix: 'Condition',
    description: 'Create a Condition Resource',
    body: load('condition.yaml')
  },
  'PipelineResource': {
    prefix: 'PipelineResource',
    description: 'Create a PipelineResource Resource',
    body: load('pipelineResource.yaml'),
  },
  'TriggerTemplate': {
    prefix: 'TriggerTemplate',
    description: 'Create a TriggerTemplate Resource',
    body: load('triggertemplate.yaml')
  },
  'TriggerBinding': {
    prefix: 'TriggerBinding',
    description: 'Create a TriggerBinding Resource',
    body: load('triggerbinding.yaml')
  },
  'ClusterTriggerBinding': {
    prefix: 'ClusterTriggerBinding',
    description: 'Create a ClusterTriggerBinding Resource',
    body: load('cluster-triggerbinding.yaml')
  },
  'EventListener': {
    prefix: 'EventListener',
    description: 'Create an EventListener Resource',
    body: load('EventListener.yaml')
  },
  'PipelineResource Type': {
    prefix: 'PipelineResourceType',
    description: 'Create a PipelineResource Type Resource',
    body: load('pipelineResourceType.yaml'),
  },
  'Pipeline Task Reference': {
    prefix: 'PipelineTaskReference',
    description: 'Tekton Pipeline Task Reference',
    body: load('pipelineTaskReference.yaml'),
  },
  'Pipeline Task Reference Input': {
    prefix: 'PipelineTaskReferenceInput',
    description: 'Tekton Pipeline Task Reference Inputs, Parameters and Outputs',
    body: load('pipelineTaskReferenceInputs.yaml'),
  },
  'Pipeline Task Conditions': {
    prefix: 'PipelineTaskConditions',
    description: 'Tekton Pipeline Task Conditions',
    body: load('pipelineTaskCondition.yaml')
  },
  'TaskStep': {
    prefix: 'TaskStep',
    description: 'Tekton Task Step',
    body: load('tektonTaskStep.yaml'),
  },
  'Param': {
    prefix: 'Parameter',
    description: 'A generic parameter used across any YAML that are key/value pair',
    body: load('tektonParameter.yaml'),
  },
  'Task Input': {
    prefix: 'TaskInput',
    description: 'Tekton Task Inputs, Parameters and Outputs',
    body: load('taskinput.yaml'),
  },
  'Task Param': {
    prefix: 'TaskParameter',
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
