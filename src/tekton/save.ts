/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import * as os from 'os';
import * as path from 'path';
import { cli } from '../cli';
import * as fs from 'fs-extra';
import * as yaml from 'js-yaml';
import * as vscode from 'vscode';
import { contextGlobalState } from '../extension';
import { tektonYaml } from '../yaml-support/tkn-yaml';
import { pipelineExplorer } from '../pipeline/pipelineExplorer';
import { getStderrString, Command, newK8sCommand } from '../tkn';

export async function save(document: vscode.TextDocument): Promise<void> {
  let value: string;
  if (document.uri.authority !== 'loadtektonresource') {
    const verifyTknYaml = tektonYaml.isTektonYaml(document);
    if (!contextGlobalState.workspaceState.get(document.uri.fsPath)) {
      value = await vscode.window.showWarningMessage('Detected Tekton resources. Do you want to deploy to cluster?', 'Deploy', 'Deploy Once', 'Cancel');
    }
    if (value === 'Deploy') {
      contextGlobalState.workspaceState.update(document.uri.fsPath, true);
    }
    if (verifyTknYaml && (/Deploy/.test(value) || contextGlobalState.workspaceState.get(document.uri.fsPath))) {
      const result = await cli.execute(Command.create(document.uri.fsPath));
      if (result.error) {
        const tempPath = os.tmpdir();
        if (!tempPath) {
          return;
        }
        const fsPath = path.join(tempPath, path.basename(document.uri.fsPath));
        try {
          let yamlData = ''
          const resourceCheckRegex = /^(Task|PipelineResource|Pipeline|Condition|ClusterTask|EventListener|TriggerBinding)$/ as RegExp;
          const fileContents = fs.readFileSync(document.uri.fsPath, 'utf8');
          const data: object[] = yaml.safeLoadAll(fileContents).filter((obj: {kind: string}) => resourceCheckRegex.test(obj.kind));
          data.map(value => {
            const yamlStr = yaml.safeDump(value);
            yamlData += yamlStr + '---\n';
          })
          await fs.writeFile(fsPath, yamlData, 'utf8');
        } catch (err) {
          // ignore
        }
        const apply = await cli.execute(newK8sCommand(`apply -f ${fsPath}`));
        await fs.unlink(fsPath);
        if (apply.error) {
          vscode.window.showErrorMessage(`Fail to deploy Resources: ${getStderrString(apply.error)}`);
        } else {
          pipelineExplorer.refresh();
          vscode.window.showInformationMessage('Resources were successfully Deploy.');
        }
      } else {
        pipelineExplorer.refresh();
        vscode.window.showInformationMessage('Resources were successfully Deploy.');
      }
    }
  }
}
