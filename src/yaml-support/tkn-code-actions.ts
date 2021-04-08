/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/
import * as vscode from 'vscode';
import { TknElementType } from '../model/element-type';
import { TknDocument } from '../model/document';
import { PipelineTask } from '../model/pipeline/pipeline-model';
import { tektonFSUri, tektonVfsProvider } from '../util/tekton-vfs';
import { TektonYamlType } from './tkn-yaml';
import { VirtualDocument, yamlLocator } from './yaml-locator';
import * as jsYaml from 'js-yaml';
import { Task } from '../tekton';
import { telemetryLogError } from '../telemetry';
import { ContextType } from '../context-type';
import * as _ from 'lodash';

interface ProviderMetadata {
  getProviderMetadata(): vscode.CodeActionProviderMetadata;
}

const INLINE_TASK = vscode.CodeActionKind.RefactorInline.append('TektonTask');
const EXTRACT_TASK = vscode.CodeActionKind.RefactorExtract.append('TektonTask');

interface InlineTaskAction extends vscode.CodeAction {
  taskRefStartPosition?: vscode.Position;
  taskRefEndPosition?: vscode.Position;
  taskRefName?: string;
  taskKind?: string;
  documentUri?: vscode.Uri;
}

function isTaskInlineAction(action: vscode.CodeAction): action is InlineTaskAction {
  return action.kind.contains(INLINE_TASK);
}

interface ExtractTaskAction extends vscode.CodeAction {
  documentUri?: vscode.Uri;
  taskSpecText?: string;
  taskSpecStartPosition?: vscode.Position;
  taskSpecEndPosition?: vscode.Position;
}

class PipelineCodeActionProvider implements vscode.CodeActionProvider {
  provideCodeActions(document: vscode.TextDocument, range: vscode.Range | vscode.Selection): vscode.ProviderResult<vscode.CodeAction[]> {
    const result = [];
    const tknDocs = yamlLocator.getTknDocuments(document);
    for (const tknDoc of tknDocs) {
      const selectedElement = this.findTask(tknDoc, range.start);
      if (selectedElement) {

        const inlineAction = this.getInlineAction(selectedElement, document);
        if (inlineAction) {
          result.push(inlineAction);
        }

        const extractAction = this.getExtractTaskAction(selectedElement, document);
        if (extractAction) {
          result.push(extractAction);
        }
      }
    }

    return result;
  }
  resolveCodeAction?(codeAction: vscode.CodeAction): Thenable<vscode.CodeAction> {
    if (isTaskInlineAction(codeAction)){
      return this.resolveInlineAction(codeAction);
    }

    if (codeAction.kind.contains(EXTRACT_TASK)) {
      return this.resolveExtractTaskAction(codeAction);
    }
    
  }

  getProviderMetadata(): vscode.CodeActionProviderMetadata {
    return {
      providedCodeActionKinds: [INLINE_TASK, EXTRACT_TASK],
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

  private getInlineAction(selectedElement: PipelineTask, document: vscode.TextDocument): InlineTaskAction | undefined {
    const taskRefName = selectedElement.taskRef?.name.value
    if (!taskRefName){
      return;
    }
    const action: InlineTaskAction = new vscode.CodeAction(`Inline '${taskRefName}' Task spec`, INLINE_TASK);
    const startPos = document.positionAt(selectedElement.taskRef?.keyNode?.startPosition);
    const endPos = document.positionAt(selectedElement.taskRef?.endPosition);
    action.taskRefStartPosition = startPos;
    action.taskRefEndPosition = endPos;
    action.taskRefName = taskRefName;
    action.taskKind = selectedElement.taskRef?.kind.value;
    action.documentUri = document.uri;

    return action;
  }

  private async resolveInlineAction(codeAction: InlineTaskAction): Promise<InlineTaskAction> {
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
        telemetryLogError('resolveCodeAction', `Cannot get '${codeAction.taskRefName}' Task definition`);
      }
      return codeAction;
    });
  }

  private getExtractTaskAction(selectedElement: PipelineTask, document: vscode.TextDocument): ExtractTaskAction | undefined {
    const taskSpec = selectedElement.taskSpec;
    if (!taskSpec) {
      return;
    }
    const startPos = document.positionAt(taskSpec.keyNode?.startPosition);
    let taskSpecStartPos = document.positionAt(taskSpec.startPosition);
    // start replace from stat of the line
    taskSpecStartPos = document.lineAt(taskSpecStartPos.line).range.start;
    let endPos = document.positionAt(taskSpec.endPosition);

    // if last line is contains only spaces then replace til previous line
    const lastLine = document.getText(new vscode.Range(endPos.line, 0, endPos.line, endPos.character));
    if (lastLine.trim().length === 0) {
      endPos = document.lineAt(endPos.line - 1).range.end;
    }

    const action: ExtractTaskAction = new vscode.CodeAction(`Extract '${selectedElement.name.value}' Task spec`, EXTRACT_TASK);
    action.documentUri = document.uri;
    action.taskSpecStartPosition = startPos;
    action.taskSpecEndPosition = endPos;
    action.taskSpecText = document.getText(new vscode.Range(taskSpecStartPos, endPos));

    return action;
  }

  private async resolveExtractTaskAction(action: ExtractTaskAction): Promise<vscode.CodeAction> {
    const name = await vscode.window.showInputBox({ignoreFocusOut: true, prompt: 'Provide Task Name' });
    const type = await vscode.window.showQuickPick(['Task', 'ClusterTask'], {placeHolder: 'Select Task Type:', canPickMany: false, ignoreFocusOut: true});
    if (!type || !name) {
      return;
    }
    return vscode.window.withProgress({location: vscode.ProgressLocation.Notification, cancellable: false, title: 'Extracting Task...' }, async (): Promise<vscode.CodeAction> => {
      try {
        const virtDoc = this.getDocForExtractedTask(name, type, action.taskSpecText);
        const saveError = await tektonVfsProvider.saveTektonDocument(virtDoc);
        if (saveError) {
          console.error(saveError);
          throw new Error(saveError);
        }
        const newUri = tektonFSUri(type, name, 'yaml');
        await vscode.commands.executeCommand('vscode.open', newUri);
        const indentation = ' '.repeat(action.taskSpecStartPosition.character);
        action.edit = new vscode.WorkspaceEdit();
        action.edit.replace(action.documentUri, new vscode.Range(action.taskSpecStartPosition, action.taskSpecEndPosition),
          `taskRef:
  ${indentation}name: ${name}
  ${indentation}kind: ${type}`);
      } catch (err) {
        console.error(err);
      }
      
      return action;
    });
  }

  private getDocForExtractedTask(name: string, type: string, content: string): VirtualDocument {

    const lines = content.split('\n');
    const firstLine = lines[0].trimLeft();
    const indentation = lines[0].length - firstLine.length;
    lines[0] = firstLine;
    for (let i = 1; i < lines.length; i++) {
      lines[i] = lines[i].slice(indentation);
    }
    content = lines.join('\n');

    const taskPart = jsYaml.load(content);
    let metadataPart: {} = undefined;
    if (taskPart.metadata) {
      metadataPart = taskPart.metadata;
      delete taskPart['metadata'];
    }

    let metadataPartStr: string = undefined;
    if (metadataPart && !_.isEmpty(metadataPart)) {
      metadataPartStr = jsYaml.dump(metadataPart, {indent: 2});
      metadataPartStr = metadataPartStr.trimRight().split('\n').map(it => '  ' + it).join('\n');
    }
    let specContent = jsYaml.dump(taskPart, {indent: 2, noArrayIndent: false});
    specContent = specContent.trimRight().split('\n').map(it => '  ' + it).join('\n');
    return {
      version: 1,
      uri: vscode.Uri.file(`file:///extracted/task/${name}.yaml`),
      getText: () => {
        return `apiVersion: tekton.dev/v1beta1
kind: ${type}
metadata:
  name: ${name}\n${metadataPartStr ? metadataPartStr : ''}
spec:
${specContent}
`;
      }
    }

  }

  private extractTaskDef(taskDoc: VirtualDocument, startPos: number, endPos): string {
    const task: Task = jsYaml.safeLoad(taskDoc.getText()) as Task;
    if (!task){
      throw new Error('Task is empty!');
    }

    if (task.metadata){
      if (task.metadata.managedFields){
        delete task.metadata.managedFields;
      }
      if (task.metadata.namespace){
        delete task.metadata.namespace;
      }
      if (task.metadata.resourceVersion){
        delete task.metadata.resourceVersion;
      }
      if (task.metadata.selfLink){
        delete task.metadata.selfLink;
      }
      if (task.metadata.uid){
        delete task.metadata.uid;
      }
      if (task.metadata.generation){
        delete task.metadata.generation;
      }
      if (task.metadata.creationTimestamp){
        delete task.metadata.creationTimestamp;
      }
      if (task.metadata.name){
        delete task.metadata.name;
      }
      if (task.metadata.ownerReferences){
        delete task.metadata.ownerReferences;
      }
      if (task.metadata.annotations && task.metadata.annotations['kubectl.kubernetes.io/last-applied-configuration']){
        delete task.metadata.annotations['kubectl.kubernetes.io/last-applied-configuration'];
      }
    }



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
