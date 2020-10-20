/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/
import * as vscode from 'vscode';
import { TektonYamlType, tektonYaml, pipelineRunYaml } from '../yaml-support/tkn-yaml';
import { previewManager, PreviewSettings } from './preview-manager';
import { CommandContext, setCommandContext } from '../commands';
import { calculatePipelineGraph, calculatePipelineRunGraph, askToSelectPipeline } from './pipeline-graph';
import { tektonFSUri, tektonVfsProvider } from '../util/tekton-vfs';
import { ContextType } from '../tkn';

export async function showPipelinePreview(): Promise<void> {
  const document = vscode.window.activeTextEditor?.document;
  if (!document) {
    return;
  }
  const resourceColumn = (vscode.window.activeTextEditor && vscode.window.activeTextEditor.viewColumn) || vscode.ViewColumn.One;
  const pipelines = tektonYaml.getTektonDocuments(document, TektonYamlType.Pipeline)
  if (pipelines?.length > 0) {
    previewManager.showPipelinePreview(document, { resourceColumn, previewColumn: resourceColumn + 1, graphProvider: calculatePipelineGraph });
    return;
  }

  const pipelineRun = tektonYaml.getTektonDocuments(document, TektonYamlType.PipelineRun);
  if (pipelineRun?.length > 0) {
    let pipelineRunDoc;
    if (pipelineRun.length > 1) {
      pipelineRunDoc = await askToSelectPipeline(pipelineRun, TektonYamlType.PipelineRun);
    } else {
      pipelineRunDoc = pipelineRun[0];
    }

    if (pipelineRunDoc) {
      previewManager.showPipelinePreview(document, {
        resourceColumn,
        previewColumn: resourceColumn + 1,
        graphProvider: calculatePipelineRunGraph,
        pipelineRunName: pipelineRunYaml.getPipelineRunName(pipelineRunDoc),
        pipelineRunStatus: pipelineRunYaml.getPipelineRunStatus(pipelineRunDoc)
      } as PreviewSettings);
    }

  }
}

export async function showPipelineRunPreview(name: string, uid?: string): Promise<void> {
  if (!name) {
    return;
  }
  const uri = tektonFSUri(ContextType.PIPELINERUN, name, 'yaml', uid);
  const pipelineRunDoc = await tektonVfsProvider.loadTektonDocument(uri, !!uid);
  const pipelineRun = tektonYaml.getTektonDocuments(pipelineRunDoc, TektonYamlType.PipelineRun);

  previewManager.createPipelinePreview(pipelineRunDoc, {
    resourceColumn: vscode.ViewColumn.Active,
    previewColumn: vscode.ViewColumn.Active,
    graphProvider: calculatePipelineRunGraph,
    pipelineRunName: name,
    pipelineRunStatus: pipelineRunYaml.getPipelineRunStatus(pipelineRun[0])
  } as PreviewSettings);
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
    const pipelines = tektonYaml.getTektonDocuments(document, TektonYamlType.Pipeline);
    if (pipelines && pipelines.length > 0) {
      return true;
    }

    const pipelineRuns = tektonYaml.getTektonDocuments(document, TektonYamlType.PipelineRun);
    if (pipelineRuns?.length > 0) {
      return true;
    }
  }

  return false;
}

