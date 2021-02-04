/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { Command, getStderrString, tkn } from '../tkn';
import * as vscode from 'vscode';
import { HubTaskInstallation } from './hub-common';
import * as semver from 'semver';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs-extra'; 
import { DownloadUtil } from '../util/download';

const installEventEmitter = new vscode.EventEmitter<HubTaskInstallation>()
export const installEvent = installEventEmitter.event;

export async function installTask(task: HubTaskInstallation): Promise<boolean> {
  try {
    if (task.tknVersion && task.minPipelinesVersion){
      if (semver.lt(task.tknVersion, task.minPipelinesVersion)){
        const result = await vscode.window.showWarningMessage(`This task requires Tekton Pipelines >= ${task.minPipelinesVersion} and is incompatible with the version of Tekton Pipelines installed on your cluster. Install anyway?`, 'Install', 'Cancel')
        if (result === 'Install'){
          return doInstall(task);
        } else {
          return false;
        }
      }
    }
    return doInstall(task);
    
  } catch (err) {
    vscode.window.showErrorMessage(err.toString());
    return false;
  }
}

async function doInstall(task: HubTaskInstallation): Promise<boolean> {
  if (task.asClusterTask) {
    return doInstallClusterTask(task);
  } else {
    return doInstallTask(task);
  }

}

async function doInstallTask(task: HubTaskInstallation): Promise<boolean> {
  return await vscode.window.withProgress({title: `Installing ${task.name}`,location: vscode.ProgressLocation.Notification}, async () => {
    try {
      const tasks = await tkn.getRawTasks();
      if (tasks) {
        for (const rawTask of tasks) {
          if (rawTask.metadata.name === task.name) {
            const overwriteResult = await vscode.window.showWarningMessage(`You already has Task '${task.name}'. Do you want to overwrite it?`, 'Overwrite', 'Cancel');
            if (overwriteResult !== 'Overwrite') {
              return false;
            }
          }
        }
      }
      const result = await tkn.execute(Command.hubInstall(task.name, task.taskVersion.version));
      if (result.error){
        vscode.window.showWarningMessage(`Task installation failed: ${getStderrString(result.error)}`);
      } else {
        vscode.window.showInformationMessage(`Task ${task.name} installed.`);
        installEventEmitter.fire(task);
        return true;
      }
    } catch (err) {
      vscode.window.showErrorMessage(err.toString());
    }
    return false;
  });
}
const taskRegexp = /^kind:[\t ]*Task[\t ]*$/m;
async function doInstallClusterTask(task: HubTaskInstallation): Promise<boolean> {
  return await vscode.window.withProgress({title: `Installing ${task.name}`,location: vscode.ProgressLocation.Notification}, async () => {
    try {
      const tasks = await tkn.getRawClusterTasks();
      if (tasks) {
        for (const rawTask of tasks) {
          if (rawTask.metadata.name === task.name) {
            const overwriteResult = await vscode.window.showWarningMessage(`You already has ClusterTask '${task.name}'. Do you want to overwrite it?`, 'Overwrite', 'Cancel');
            if (overwriteResult !== 'Overwrite') {
              return false;
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
        installEventEmitter.fire(task);
        return true;
      }
    } catch (err) {
      vscode.window.showErrorMessage(err.toString());
    }
    return false;
  });
}
