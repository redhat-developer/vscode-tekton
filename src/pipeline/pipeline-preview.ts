/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/
import * as vscode from 'vscode';
import { TektonYamlType, getTektonDocuments } from '../yaml-support/tkn-yaml';
import { previewManager } from './preview-manager';
import { CommandContext, setCommandContext } from '../commands';
import { calculatePipelineGraph, calculatePipelineRunGraph } from './pipeline-graph';

export function showPipelinePreview(): void {
  const document = vscode.window.activeTextEditor?.document;
  if (!document) {
    return;
  }
  const resourceColumn = (vscode.window.activeTextEditor && vscode.window.activeTextEditor.viewColumn) || vscode.ViewColumn.One;
  const pipelines = getTektonDocuments(document, TektonYamlType.Pipeline)
  if (pipelines?.length > 0) {
    previewManager.showPipelinePreview(document, { resourceColumn, previewColumn: resourceColumn + 1, graphProvider: calculatePipelineGraph });
    return;
  }

  const pipelineRun = getTektonDocuments(document, TektonYamlType.PipelineRun);
  if (pipelineRun?.length > 0) {
    previewManager.showPipelinePreview(document, { resourceColumn, previewColumn: resourceColumn + 1, graphProvider: calculatePipelineRunGraph });
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

    const pipelineRuns = getTektonDocuments(document, TektonYamlType.PipelineRun);
    if (pipelineRuns?.length > 0) {
      return true;
    }
  }

  return false;
}

