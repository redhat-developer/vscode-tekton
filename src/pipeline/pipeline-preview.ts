/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/
import * as vscode from 'vscode';
import { isTektonYaml, TektonYamlType, getTektonDocuments } from '../yaml-support/tkn-yaml';
import { previewManager } from './preview-manager';
import { CommandContext, setCommandContext } from '../commands';

export function showPipelinePreview(): void {
  const document = vscode.window.activeTextEditor.document;
  const resourceColumn = (vscode.window.activeTextEditor && vscode.window.activeTextEditor.viewColumn) || vscode.ViewColumn.One;
  const pipelines = getTektonDocuments(document, TektonYamlType.Pipeline)
  if (pipelines) {
    previewManager.showPreview(document, { resourceColumn, previewColumn: resourceColumn + 1 });
  }
}

export function registerPipelinePreviewContext(): void {

  setCommandContext(CommandContext.PipelinePreview, getContext(vscode.window.activeTextEditor?.document));

  vscode.window.onDidChangeActiveTextEditor(e => {
    setCommandContext(CommandContext.PipelinePreview, getContext(e?.document));
  });
}

function getContext(document?: vscode.TextDocument): boolean {
  if (!document) {
    return false;
  }

  if (document.languageId === 'yaml') {
    const pipelines = getTektonDocuments(document, TektonYamlType.Pipeline);
    if (pipelines && pipelines.length > 0) {

      return true;
    }
  }

  return false;
}

