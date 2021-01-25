/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { Command, getStderrString, tkn } from '../tkn';
import * as vscode from 'vscode';
import { HubTaskInstallation } from './install-common';
import * as semver from 'semver';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs-extra'; 
import { DownloadUtil } from '../util/download';

export async function installTask(task: HubTaskInstallation): Promise<void> {
  try {
    if (task.tknVersion && task.minPipelinesVersion){
      if (semver.lt(task.tknVersion, task.minPipelinesVersion)){
        const result = await vscode.window.showWarningMessage(`This task requires Tekton Pipelines >= ${task.minPipelinesVersion} and is incompatible with the version of Tekton Pipelines installed on your cluster. Install anyway?`, 'Install', 'Cancel')
        if (result === 'Install'){
          await doInstall(task);
        } else {
          return;
        }
      }
    }
    await doInstall(task);
    
  } catch (err) {
    vscode.window.showErrorMessage(err.toString());
  }
}

async function doInstall(task: HubTaskInstallation): Promise<void> {
  if (task.asClusterTask) {
    await doInstallClusterTask(task);
  } else {
    doInstallTask(task);
  }

}

function doInstallTask(task: HubTaskInstallation): void {
  vscode.window.withProgress({title: `Installing ${task.name}`,location: vscode.ProgressLocation.Notification}, async () => {
    try {
      const tasks = await tkn.getRawTasks();
      if (tasks) {
        for (const rawTask of tasks) {
          if (rawTask.metadata.name === task.name) {
            const overwriteResult = await vscode.window.showWarningMessage(`You already has Task '${task.name}'. Do you want to overwrite it?`, 'Overwrite', 'Cancel');
            if (overwriteResult !== 'Overwrite') {
              return;
            }
          }
        }
      }
      const result = await tkn.execute(Command.hubInstall(task.name, task.taskVersion));
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
const taskRegexp = /^kind:[\t ]*Task[\t ]*$/m;
async function doInstallClusterTask(task: HubTaskInstallation): Promise<void> {
  await vscode.window.withProgress({title: `Installing ${task.name}`,location: vscode.ProgressLocation.Notification}, async () => {
    try {
      const tasks = await tkn.getRawClusterTasks();
      if (tasks) {
        for (const rawTask of tasks) {
          if (rawTask.metadata.name === task.name) {
            const overwriteResult = await vscode.window.showWarningMessage(`You already has ClusterTask '${task.name}'. Do you want to overwrite it?`, 'Overwrite', 'Cancel');
            if (overwriteResult !== 'Overwrite') {
              return;
            }
          }
        }
      }
      const url = vscode.Uri.parse(task.url);
      const tempFile = path.join(os.tmpdir(), path.basename(url.fsPath));
      await DownloadUtil.downloadFile(task.url, tempFile);
      if (await fs.pathExists(tempFile)) {
        let content = await fs.readFile(tempFile, {encoding : 'UTF8'});
        content = content.replace(taskRegexp, 'kind: ClusterTask');
        await fs.writeFile(tempFile, content);
      
      }
      const result = await tkn.execute(Command.updateYaml(tempFile));
      await fs.unlink(tempFile);
      if (result.error){
        vscode.window.showWarningMessage(`ClusterTask installation failed: ${getStderrString(result.error)}`);
      } else {
        vscode.window.showInformationMessage(`ClusterTask ${task.name} installed.`);
      }
    } catch (err) {
      vscode.window.showErrorMessage(err.toString());
    }
  });
}
