/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { Command, getStderrString, tkn } from '../tkn';
import * as vscode from 'vscode';
import { HubTaskInstallation } from './install-common';
import * as semver from 'semver';

export async function installTask(task: HubTaskInstallation): Promise<void> {
  try {
    if (task.tknVersion && task.minPipelinesVersion){
      if (semver.lt(task.tknVersion, task.minPipelinesVersion)){
        const result = await vscode.window.showWarningMessage(`This task requires Tekton Pipelines >= ${task.minPipelinesVersion} and is incompatible with the version of Tekton Pipelines installed on your cluster. Install anyway?`, 'Install', 'Cancel')
        if (result === 'Install'){
          doInstall(task);
        } else {
          return;
        }
      }
    }
    doInstall(task);
    
  } catch (err) {
    vscode.window.showErrorMessage(err.toString());
  }
}

function doInstall(task: HubTaskInstallation): void {
  vscode.window.withProgress({title: `Installing ${task.name}`,location: vscode.ProgressLocation.Notification}, async () => {
    try {
      const result = await tkn.execute(Command.updateYaml(task.url));
      if (result.error){
        vscode.window.showWarningMessage(`Task installation failed: ${getStderrString(result.error)}`);
      } else {
        vscode.window.showInformationMessage(`Task ${task.name} installed.`);
      }
    } catch (err) {
      vscode.window.showErrorMessage(err.toString());
    }
  });
}
