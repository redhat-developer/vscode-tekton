/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { pipelineExplorer } from '../pipeline/pipelineExplorer';
import { getStderrString, Command } from '../tkn';
import { cli } from '../cli';
import { tektonYaml } from '../yaml-support/tkn-yaml';
import { contextGlobalState } from '../extension';

export async function save(document: vscode.TextDocument): Promise<void> {
  let value: string;
  if (document.uri.authority !== 'loadtektonresource') {
    const verifyTknYaml = tektonYaml.isTektonYaml(document);
    if (!contextGlobalState.workspaceState.get(document.uri.fsPath)) {
      value = await vscode.window.showWarningMessage('Detected Tekton yaml resource file. Do you want to deploy to cluster?', 'Save', 'Save Once', 'Cancel');
    }
    if (value === 'Save') {
      contextGlobalState.workspaceState.update(document.uri.fsPath, true);
    }
    if (verifyTknYaml && (/Save/.test(value) || contextGlobalState.workspaceState.get(document.uri.fsPath))) {
      const result = await cli.execute(Command.create(document.uri.fsPath))
      if (result.error) {
        vscode.window.showErrorMessage(getStderrString(result.error));
      } else {
        pipelineExplorer.refresh();
        vscode.window.showInformationMessage('Resources were successfully created.');
      }
    }
  }
}
