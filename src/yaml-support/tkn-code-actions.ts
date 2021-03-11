/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/
import * as vscode from 'vscode';
import { TknElementType } from '../model/element-type';
import { TknDocument } from '../model/document';
import { PipelineTask } from '../model/pipeline/pipeline-model';
import { ContextType } from '../tkn';
import { tektonFSUri, tektonVfsProvider } from '../util/tekton-vfs';
import { TektonYamlType } from './tkn-yaml';
import { VirtualDocument, yamlLocator } from './yaml-locator';
import * as jsYaml from 'js-yaml';
import { Task } from '../tekton';

interface ProviderMetadata {
  getProviderMetadata(): vscode.CodeActionProviderMetadata;
}

interface TaskInlineAction extends vscode.CodeAction{
  taskRefStartPosition?: vscode.Position;
  taskRefEndPosition?: vscode.Position;
  taskRefName?: string;
  taskKind?: string;
  documentUri?: vscode.Uri;
}

class PipelineCodeActionProvider implements vscode.CodeActionProvider {
  provideCodeActions(document: vscode.TextDocument, range: vscode.Range | vscode.Selection): vscode.ProviderResult<vscode.CodeAction[]> {
    const result = [];
    const tknDocs = yamlLocator.getTknDocuments(document);
    for (const tknDoc of tknDocs) {
      const selectedElement = this.findTask(tknDoc, range.start);
      if (selectedElement) {
        const taskRefName = selectedElement.taskRef?.name.value
        if (!taskRefName){
          continue;
        }
        const action: TaskInlineAction = new vscode.CodeAction(`Inline '${taskRefName}' Task spec`, vscode.CodeActionKind.RefactorInline.append('TektonTask'));
        const startPos = document.positionAt(selectedElement.taskRef?.keyNode?.startPosition);
        const endPos = document.positionAt(selectedElement.taskRef?.endPosition);
        action.taskRefStartPosition = startPos;
        action.taskRefEndPosition = endPos;
        action.taskRefName = taskRefName;
        action.taskKind = selectedElement.taskRef?.kind.value;
        action.documentUri = document.uri;
        result.push(action);
      }
    }

    return result;
  }
  resolveCodeAction?(codeAction: TaskInlineAction): Thenable<vscode.CodeAction> {
    return vscode.window.withProgress({location: vscode.ProgressLocation.Notification, cancellable: false, title: `Loading '${codeAction.taskRefName}' Task...` }, async (): Promise<vscode.CodeAction> => {
      const uri = tektonFSUri(codeAction.taskKind === TektonYamlType.ClusterTask ? ContextType.CLUSTERTASK : ContextType.TASK , codeAction.taskRefName, 'yaml');
      try {
        const taskDoc = await tektonVfsProvider.loadTektonDocument(uri, false);
        codeAction.edit = new vscode.WorkspaceEdit();
        codeAction.edit.replace(codeAction.documentUri,
          new vscode.Range(codeAction.taskRefStartPosition, codeAction.taskRefEndPosition), 
          this.extractTaskDef(taskDoc, codeAction.taskRefStartPosition.character, codeAction.taskRefEndPosition.character));
      } catch (err){
        vscode.window.showErrorMessage('Cannot get Tekton Task definition: ' + err.toString());
        console.error(err);
      }
      return codeAction;
    });
    
  }

  getProviderMetadata(): vscode.CodeActionProviderMetadata {
    return {
      providedCodeActionKinds: [vscode.CodeActionKind.RefactorInline.append('TektonTask')],
    }
  }

  findTask(doc: TknDocument, pos: vscode.Position): PipelineTask | undefined {
    const selectedElement = doc.findElementAt(pos);
    if (!selectedElement) {
      return undefined;
    }
    if (selectedElement.type === TknElementType.PIPELINE_TASK) {
      return selectedElement as PipelineTask;
    }

    let parent = selectedElement.parent;
    while (parent) {
      if (parent.type === TknElementType.PIPELINE_TASK) {
        return parent as PipelineTask;
      }

      parent = parent.parent;
    }

    return undefined;

  }

  private extractTaskDef(taskDoc: VirtualDocument, startPos: number, endPos): string {
    const task: Task = jsYaml.safeLoad(taskDoc.getText()) as Task;

    delete task.metadata.managedFields;
    delete task.metadata.namespace;
    delete task.metadata.resourceVersion;
    delete task.metadata.selfLink;
    delete task.metadata.uid;
    delete task.metadata.generation;
    delete task.metadata.creationTimestamp;
    delete task.metadata.name;
    delete task.metadata.ownerReferences;
    delete task.metadata.annotations['kubectl.kubernetes.io/last-applied-configuration'];


    const tabSize: number = vscode.workspace.getConfiguration('editor',{languageId: 'yaml'} ).get('tabSize');
    let result = 'taskSpec:\n'; 
    const content = jsYaml.dump({metadata:task.metadata, ...task.spec}, {indent: tabSize});
    const lines = content.split('\n').map(it => it ? ' '.repeat(startPos + tabSize) + it : '').join('\n');
    result += lines + ' '.repeat(endPos);
    return result;
  }

}

export class TknCodeActionProviders {

  private providers = new Map<TektonYamlType, vscode.CodeActionProvider & ProviderMetadata>();

  constructor() {
    this.providers.set(TektonYamlType.Pipeline, new PipelineCodeActionProvider());
  }


  getProviderMetadata(type: TektonYamlType): vscode.CodeActionProviderMetadata {
    return this.providers.get(type).getProviderMetadata();
  }

  getProvider(type: TektonYamlType): vscode.CodeActionProvider {
    return this.providers.get(type);
  }

  isSupports(type: TektonYamlType): boolean {
    return this.providers.has(type);
  }

}

export const codeActionProvider = new TknCodeActionProviders();
