/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/
import * as vscode from 'vscode';
import * as path from 'path';
import { readFile } from 'fs-extra'
import { getTknTasksSnippets } from './tkn-tasks-provider';
import { schemeStorage } from './tkn-scheme-storage'
import { pipelineYaml } from './tkn-yaml';
import { Snippet } from './snippet';
import { getTknConditionsSnippets } from './tkn-conditions-provider';

export function generateScheme(vsDocument: vscode.TextDocument, schemaPath: string): Promise<string> {

  return schemeStorage.getScheme(vsDocument, doc => generate(doc, schemaPath));
}


// eslint-disable-next-line @typescript-eslint/no-explicit-any
function injectTaskSnippets(templateObj: any, snippets: Snippet<{}>[]): {} {
  templateObj.definitions.PipelineSpec.properties.tasks.defaultSnippets = snippets;
  return templateObj;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function injectTasksName(templateObj: any, tasks: string[], tasksRef: string[]): {} {
  templateObj.definitions.PipelineTask.properties.runAfter.items.enum = tasks;

  //inject names of all tasks deployed in cluster + namespace
  if (tasksRef && tasksRef.length > 0) {
    templateObj.definitions.TaskRef.properties.name.enum = tasksRef;
  }

  return templateObj;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function injectResourceName(templateObj: any, resNames: string[]): {} {
  if (resNames && resNames.length > 0) {
    templateObj.definitions.PipelineTaskInputResource.properties.resource.enum = resNames;
    templateObj.definitions.PipelineTaskOutputResource.properties.resource.enum = resNames;
  }

  return templateObj;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function injectConditionRefs(templateObj: any, conditions: string[]): {} {
  if (conditions && conditions.length > 0) {
    templateObj.definitions.PipelineTaskCondition.properties.conditionRef.enum = conditions;
  }
  return templateObj;
}


// eslint-disable-next-line @typescript-eslint/no-explicit-any
function injectMarkdownDescription(templateObj: any): {} {
  templateObj.definitions.Pipeline.properties.apiVersion.markdownDescription = 'Specifies the API version, for example `tekton.dev/v1beta1`. [more](https://kubernetes.io/docs/concepts/overview/working-with-objects/kubernetes-objects/#required-fields)';
  templateObj.definitions.Pipeline.properties.kind.markdownDescription = 'Identifies this resource object as a `Pipeline` object. [more](https://kubernetes.io/docs/concepts/overview/working-with-objects/kubernetes-objects/#required-fields)';
  templateObj.definitions.Pipeline.properties.metadata.markdownDescription = 'Specifies metadata that uniquely identifies the `Pipeline` object. For example, a `name`. [more](https://kubernetes.io/docs/concepts/overview/working-with-objects/kubernetes-objects/#required-fields)';
  templateObj.definitions.Pipeline.properties.spec.markdownDescription = `Specifies the configuration information for
  this \`Pipeline\` object. This must include: 
  - [\`tasks\`](https://tekton.dev/docs/pipelines/pipelines/#adding-tasks-to-the-pipeline) - Specifies the \`Tasks\` that comprise the \`Pipeline\`;
    and the details of their execution.`;
  templateObj.definitions.PipelineSpec.properties.resources.markdownDescription = 'Specifies [`PipelineResources`](https://tekton.dev/docs/pipelines/resources) needed or created by the `Tasks` comprising the `Pipeline`.'
  templateObj.definitions.PipelineSpec.properties.params.markdownDescription = 'You can specify global parameters, such as compilation flags or artifact names, that you want to supply to the `Pipeline` at execution time. `Parameters` are passed to the `Pipeline` from its corresponding `PipelineRun` and can replace template values specified within each `Task` in the `Pipeline`. [more](https://tekton.dev/docs/pipelines/pipelines/#specifying-parameters)';
  templateObj.definitions.PipelineSpec.properties.description.markdownDescription = 'The `description` field is an optional field and can be used to provide description of the `Pipeline`.';
  templateObj.definitions.PipelineSpec.properties.tasks.markdownDescription = 'Specifies the `Tasks` that comprise the `Pipeline`. [more](https://tekton.dev/docs/pipelines/pipelines/#adding-tasks-to-the-pipeline)';
  templateObj.definitions.PipelineSpec.properties.workspaces.markdownDescription = '`Workspaces` allow you to specify one or more volumes that each `Task` in the `Pipeline` requires during execution. You specify one or more `Workspaces` in the `workspaces` field. [more](https://tekton.dev/docs/pipelines/pipelines/#specifying-workspaces)';

  templateObj.definitions.PipelineTask.properties.name.markdownDescription = '`name` is the name of this task within the context of a Pipeline. Name is used as a coordinate with the `from` and `runAfter` fields to establish the execution order of tasks relative to one another.';
  templateObj.definitions.PipelineTask.properties.taskRef.markdownDescription = '`taskRef` is a reference to a task definition.';
  templateObj.definitions.PipelineTask.properties.taskSpec.markdownDescription = '`taskSpec` is a specification of a task';
  templateObj.definitions.PipelineTask.properties.conditions.markdownDescription = 'Specifies `conditions` that only allow a `Task` to execute if they successfully evaluate. [more](https://tekton.dev/docs/pipelines/pipelines/#guard-task-execution-using-conditions)';
  templateObj.definitions.PipelineTask.properties.retries.markdownDescription = 'Specifies the number of times to retry the execution of a `Task` after a failure. Does not apply to execution cancellations. [more](https://tekton.dev/docs/pipelines/pipelines/#guard-task-execution-using-conditions)';
  templateObj.definitions.PipelineTask.properties.runAfter.markdownDescription = 'Indicates that a `Task` should execute after one or more other `Tasks` without output linking. [more](https://tekton.dev/docs/pipelines/pipelines/#using-the-runafter-parameter)';
  templateObj.definitions.PipelineTask.properties.resources.markdownDescription = 'Resources declares the resources given to this task as inputs and outputs.';
  templateObj.definitions.PipelineTask.properties.params.markdownDescription = 'Parameters declares parameters passed to this task.';
  templateObj.definitions.PipelineTask.properties.workspaces.markdownDescription = 'Workspaces maps workspaces from the pipeline spec to the workspaces declared in the Task.';
  templateObj.definitions.PipelineTask.properties.timeout.markdownDescription = 'Time after which the TaskRun times out. Defaults to 1 hour. Specified TaskRun timeout should be less than 24h.'

  return templateObj;
}

async function generate(doc: vscode.TextDocument, schemaPath: string): Promise<string> {

  const template = await readFile(schemaPath, 'UTF8');
  if (schemaPath.endsWith(path.join('tekton.dev', 'v1beta1_Pipeline.json'))) {
    const snippets = await getTknTasksSnippets();
    const conditions = await getTknConditionsSnippets();
    const definedTasks = pipelineYaml.getPipelineTasksName(doc);
    const declaredResources = pipelineYaml.getDeclaredResources(doc);

    const resNames = declaredResources.map(item => item.name);
    const templateObj = JSON.parse(template);
    let templateWithSnippets = injectTaskSnippets(templateObj, snippets);
    const tasksRef = snippets.map(value => value.body.taskRef.name);
    templateWithSnippets = injectTasksName(templateWithSnippets, definedTasks, tasksRef);
    templateWithSnippets = injectResourceName(templateWithSnippets, resNames);
    templateWithSnippets = injectConditionRefs(templateWithSnippets, conditions);
    templateWithSnippets = injectMarkdownDescription(templateWithSnippets);
    return JSON.stringify(templateWithSnippets);
  }

  return template;
}
