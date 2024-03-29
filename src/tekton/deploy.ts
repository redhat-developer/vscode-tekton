/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs-extra';
import * as yaml from 'js-yaml';
import * as vscode from 'vscode';
import { contextGlobalState } from '../extension';
import { tektonYaml } from '../yaml-support/tkn-yaml';
import { pipelineExplorer } from '../pipeline/pipelineExplorer';
import { Platform } from '../util/platform';
import { getStderrString } from '../util/stderrstring';
import { Command } from '../cli-command';
import { tkn } from '../tkn';

function checkDeploy(): boolean {
  return vscode.workspace
    .getConfiguration('vs-tekton')
    .get<boolean>('deploy');
}

function hasErrorsInDocument(doc: vscode.TextDocument): boolean {
  const diagnostics = vscode.languages.getDiagnostics(doc.uri);
  for (const diagnostic of diagnostics) {
    if (diagnostic.severity === vscode.DiagnosticSeverity.Error) {
      return true;
    }
  }

  return false;
}

export async function updateTektonResource(document: vscode.TextDocument): Promise<void> {
  let value: string;
  if (!checkDeploy()) return;
  if (document.languageId !== 'yaml') return;
  if (!(document.uri.scheme.startsWith('tekton'))) {
    const verifyTknYaml = tektonYaml.isTektonYaml(document);
    const hasErrors = hasErrorsInDocument(document);
    if (!contextGlobalState.workspaceState.get(document.uri.fsPath) && verifyTknYaml && !hasErrors) {
      value = await vscode.window.showWarningMessage('Detected Tekton resources. Do you want to deploy to cluster?', 'Deploy', 'Deploy Once', 'Cancel');
    }
    if (value === 'Deploy') {
      contextGlobalState.workspaceState.update(document.uri.fsPath, true);
    }
    if (verifyTknYaml && !hasErrors && (/Deploy/.test(value) || contextGlobalState.workspaceState.get(document.uri.fsPath))) {
      const quote = Platform.OS === 'win32' ? '"' : '\'';
      const result = await tkn.execute(Command.create(`${quote}${document.uri.fsPath}${quote}`));
      if (result.error) {
        const tempPath = os.tmpdir();
        if (!tempPath) {
          return;
        }
        const fsPath = path.join(tempPath, path.basename(document.uri.fsPath));
        try {
          let yamlData = '';
          const resourceCheckRegex = /^(Task|PipelineResource|Pipeline|Condition|ClusterTask|EventListener|TriggerBinding)$/ as RegExp;
          const fileContents = await fs.readFile(document.uri.fsPath, 'utf8');
          const data: object[] = yaml.safeLoadAll(fileContents).filter((obj: { kind: string }) => {
            if (obj) {
              return resourceCheckRegex.test(obj.kind)
            }
          });
          if (data.length === 0) return;
          data.map(value => {
            const yamlStr = yaml.safeDump(value);
            yamlData += yamlStr + '---\n';
          })
          await fs.writeFile(fsPath, yamlData, 'utf8');
        } catch (err) {
          // ignore
        }
        const apply = await tkn.execute(Command.apply(`${quote}${fsPath}${quote}`));
        await fs.unlink(fsPath);
        if (apply.error) {
          vscode.window.showErrorMessage(`Fail to deploy Resources: ${getStderrString(apply.error)}`);
        } else {
          pipelineExplorer.refresh();
          vscode.window.showInformationMessage('Resources were successfully Deploy.');
        }
      } else {
        pipelineExplorer.refresh();
        vscode.window.showInformationMessage('Resources were successfully Created.');
      }
    }
  }
}
