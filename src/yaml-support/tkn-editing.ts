/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { TektonYamlType, tektonYaml } from './tkn-yaml';
import { yamlLocator } from './yaml-locator';
import { TknElementType, TknStringElement, TknElement } from '../model/common';
import { TknDocument } from '../model/document';
import { Pipeline, PipelineTaskRef, PipelineTaskKind, PipelineTaskCondition } from '../model/pipeline/pipeline-model';
import { Disposable } from '../util/disposable';
import { tektonFSUri } from '../util/tekton-vfs';

const providersMap = new Map<TektonYamlType, TknTypeDefinitionProvider>();


interface TknTypeDefinitionProvider {
  provideDefinition(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): vscode.ProviderResult<vscode.Location | vscode.Location[] | vscode.LocationLink[]>;
}

export class TknDefinitionProvider implements vscode.DefinitionProvider {

  provideDefinition(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): vscode.ProviderResult<vscode.Location | vscode.Location[] | vscode.LocationLink[]> {
    const type = tektonYaml.isTektonYaml(document);
    if (type && providersMap.has(type)) {
      return providersMap.get(type).provideDefinition(document, position, token);
    }
    return undefined;
  }

}

export class PipelineDefinitionProvider implements TknTypeDefinitionProvider {

  provideDefinition(document: vscode.TextDocument, position: vscode.Position): vscode.ProviderResult<vscode.Location | vscode.Location[] | vscode.LocationLink[]> {
    const element = yamlLocator.getMatchedTknElement(document, position);
    if (element) {
      const tknDoc = yamlLocator.findTknDocument(document, position);
      if (element.parent.type === TknElementType.PIPELINE_TASK_RUN_AFTER) {
        const pipeTask = this.findPipelineTask((element as TknStringElement).value, tknDoc);
        if (pipeTask) {
          return convertTknToLocation(pipeTask, document);
        }
      }

      if (element.parent.type === TknElementType.PIPELINE_TASK_INPUT_RESOURCE || element.parent.type === TknElementType.PIPELINE_TASK_OUTPUTS_RESOURCE) {
        const resDeclaration = this.findResourceDeclaration((element as TknStringElement).value, tknDoc);
        if (resDeclaration) {
          return convertTknToLocation(resDeclaration, document);
        }
      }

      if (element.parent.type === TknElementType.PIPELINE_TASK_INPUT_RESOURCE_FROM) {
        const pipeTask = this.findPipelineTask((element as TknStringElement).value, tknDoc);
        if (pipeTask) {
          return convertTknToLocation(pipeTask, document);
        }
      }

      if (element.parent.type === TknElementType.PIPELINE_TASK_REF) {
        return this.getTaskRefLocation(element.parent as PipelineTaskRef);
      }

      if (element.parent.type === TknElementType.PIPELINE_TASK_CONDITION) {
        return this.getConditionLocation(element.parent as PipelineTaskCondition);
      }
    }

    return undefined;
  }

  private findPipelineTask(taskName: string, doc: TknDocument): TknElement | undefined {
    const pipeline = doc.getChildren<Pipeline>();
    let result = undefined;
    pipeline.spec.tasks.getChildren()?.forEach(el => {
      if (el.name.value === taskName) {
        result = el.name;
      }
    });

    return result;
  }

  private findResourceDeclaration(resName: string, doc: TknDocument): TknElement | undefined {
    const pipeline = doc.getChildren<Pipeline>();
    for (const param of pipeline.spec.resources?.getChildren()) {
      if (param.name.value === resName) {
        return param.name;
      }
    }

    return undefined;
  }

  private getTaskRefLocation(taskRef: PipelineTaskRef): vscode.Location {
    const type = taskRef.kind.value;
    return generateLinkForTektonResource(type === PipelineTaskKind.Task ? 'task' : 'clustertask', taskRef.name.value);
  }

  private getConditionLocation(taskCondition: PipelineTaskCondition): vscode.Location {
    return generateLinkForTektonResource('conditions', taskCondition.conditionRef.value);
  }
}

function generateLinkForTektonResource(resourceType: string, name: string): vscode.Location {
  const uri = tektonFSUri(resourceType, name, 'yaml');
  return new vscode.Location(uri, new vscode.Position(1, 6)); // just guessing name position
}

function convertTknToLocation(element: TknElement, doc: vscode.TextDocument): vscode.Location {
  return new vscode.Location(doc.uri, new vscode.Range(doc.positionAt(element.startPosition), doc.positionAt(element.endPosition)));
}

const definitionProvider = new TknDefinitionProvider();
const disposable = new Disposable();
providersMap.set(TektonYamlType.Pipeline, new PipelineDefinitionProvider());

export function initializeTknEditing(context: vscode.ExtensionContext): void {
  context.subscriptions.push(disposable);
  vscode.workspace.textDocuments.forEach(handleTextDocument);
  disposable.register(vscode.workspace.onDidOpenTextDocument(handleTextDocument));
}

function handleTextDocument(doc: vscode.TextDocument): void {
  if (doc.languageId === 'yaml') {
    const type = tektonYaml.isTektonYaml(doc);
    if (type && providersMap.has(type)) {
      disposable.register(vscode.languages.registerDefinitionProvider({ language: 'yaml', pattern: doc.fileName }, definitionProvider))
    }
  }
}
