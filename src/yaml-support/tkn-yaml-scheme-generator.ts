/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/
import * as vscode from 'vscode';
import * as path from 'path';
import { readFile } from 'fs-extra'
import { Snippet, getTknTasksSnippets } from './tkn-tasks-provider';
import { schemeStorage } from './tkn-scheme-storage'
import { getPipelineTasksName, getDeclaredResources } from './tkn-yaml';

let context: vscode.ExtensionContext;
export function generateScheme(extContext: vscode.ExtensionContext, vsDocument: vscode.TextDocument): Promise<string> {
    context = extContext;

    return schemeStorage.getScheme(vsDocument, generate);
}


function injectTaskSnippets(templateObj: any, snippets: Snippet[]): {} {
    templateObj.definitions.PipelineSpec.properties.tasks.defaultSnippets = snippets;
    return templateObj;
}

function injectTasksName(templateObj: any, tasks: string[], tasksRef: string[]): {} {
    templateObj.definitions.PipelineTask.properties.runAfter.items.enum = tasks;

    //inject names of all tasks deployed in cluster + namespace
    if (tasksRef && tasksRef.length > 0) {
        templateObj.definitions.TaskRef.properties.name.enum = tasksRef;
    }

    return templateObj;
}

function injectResourceName(templateObj: any, resNames: string[]): {} {
    if (resNames && resNames.length > 0) {
        templateObj.definitions.PipelineTaskInputResource.properties.resource.enum = resNames;
        templateObj.definitions.PipelineTaskOutputResource.properties.resource.enum = resNames;
    }
    
    return templateObj;
}

async function generate(doc: vscode.TextDocument): Promise<string> {
    const template = await readFile(path.join(context.extensionPath, 'scheme', 'pipeline.json'), 'UTF8');
    const snippets = await getTknTasksSnippets();
    const definedTasks = getPipelineTasksName(doc);
    const declaredResources = getDeclaredResources(doc);

    const resNames = declaredResources.map(item => item.name);
    const templateObj = JSON.parse(template);
    let templateWithSnippets = injectTaskSnippets(templateObj, snippets);
    const tasksRef = snippets.map(value => value.body.taskRef.name);
    templateWithSnippets = injectTasksName(templateWithSnippets, definedTasks, tasksRef);
    templateWithSnippets = injectResourceName(templateWithSnippets, resNames);
    return JSON.stringify(templateWithSnippets);
}
