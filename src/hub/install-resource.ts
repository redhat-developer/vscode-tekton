/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { tkn } from '../tkn';
import * as vscode from 'vscode';
import { HubResourceInstallation } from './hub-common';
import * as semver from 'semver';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs-extra'; 
import { DownloadUtil } from '../util/download';
import * as jsYaml from 'js-yaml';
import { getStderrString } from '../util/stderrstring';
import { Command } from '../cli-command';
import { telemetryLog, telemetryLogError } from '../telemetry';
import { CliExitData } from '../cli';
import { getPipelineList } from '../util/list-tekton-resource';

const installEventEmitter = new vscode.EventEmitter<HubResourceInstallation>()
export const installEvent = installEventEmitter.event;

export async function installResource(resource: HubResourceInstallation): Promise<boolean> {
  try {
    if (resource.tknVersion && resource.minPipelinesVersion){
      if (semver.lt(resource.tknVersion, resource.minPipelinesVersion)){
        const result = await vscode.window.showWarningMessage(`This resource requires Tekton Pipelines >= ${resource.minPipelinesVersion} and is incompatible with the version of Tekton Pipelines installed on your cluster. Install anyway?`, 'Install', 'Cancel')
        if (result === 'Install'){
          return doInstall(resource);
        } else {
          return false;
        }
      }
    }
    return doInstall(resource);
    
  } catch (err) {
    vscode.window.showErrorMessage(err.toString());
    return false;
  }
}

async function doInstall(task: HubResourceInstallation): Promise<boolean> {
  if (task.kind === 'Pipeline'){
    return doInstallPipeline(task);
  }

  if (task.asClusterTask) {
    return doInstallClusterTask(task);
  } else {
    return doInstallTask(task);
  }

}

async function doInstallPipeline(resource: HubResourceInstallation): Promise<boolean> {
  return await vscode.window.withProgress({title: `Installing ${resource.name}`,location: vscode.ProgressLocation.Notification}, async () => {
    try {
      const pipelines = await getPipelineList();
      if (pipelines) {
        for (const rawPipeline of pipelines) {
          if (rawPipeline.metadata.name === resource.name) {
            const overwriteResult = await vscode.window.showWarningMessage(`You already has Pipeline '${resource.name}'. Do you want to overwrite it?`, 'Overwrite', 'Cancel');
            if (overwriteResult !== 'Overwrite') {
              return false;
            }
          }
        }
      }
      
      let message: string;
      const result = await tkn.execute(Command.hubGetPipeline(resource.name));
    

      if (result.error){
        message = `Pipeline installation failed: ${getStderrString(result.error)}`;
        telemetryLogError('tekton.hub', message);
        vscode.window.showWarningMessage(message);
      } else {
        const pipelineContent = result.stdout;
        const url = vscode.Uri.parse(resource.url);
        const tempFile = path.join(os.tmpdir(), path.basename(url.fsPath));

        const yaml = jsYaml.safeLoadAll(pipelineContent);
        if (yaml[0]) {
          if (!yaml[0].metadata) {
            yaml[0].metadata = [];
          }
          yaml[0].metadata.labels['hub.tekton.dev/catalog'] = 'tekton';
          await fs.writeFile(tempFile, jsYaml.dump(yaml[0]));
        }
        const applyResult = await tkn.execute(Command.apply(tempFile));
        let message: string;
        await fs.unlink(tempFile);
        if (applyResult.error) {
          telemetryLogError('tekton.hub', applyResult.error.toString().replace(tempFile, 'user path'));
          vscode.window.showWarningMessage(`Pipeline installation failed: ${getStderrString(applyResult.error)}`);
        } else {
          message = `Pipeline ${resource.name} installed.`;
          vscode.window.showInformationMessage(message);
          telemetryLog('tekton.hub.install.pipeline', message);
          installEventEmitter.fire(resource);
          return true;
        }
      }
    } catch (err) {
      telemetryLogError('tekton.hub.catch', err.toString());
      vscode.window.showErrorMessage(err.toString());
    }
    return false;
  });
}

async function doInstallTask(task: HubResourceInstallation): Promise<boolean> {
  return await vscode.window.withProgress({title: `Installing ${task.name}`,location: vscode.ProgressLocation.Notification}, async () => {
    try {
      const tasks = await tkn.getRawTasks();
      let needToUpgrade = false;
      let installedVersion: string;
      if (tasks) {
        for (const rawTask of tasks) {
          if (rawTask.metadata.name === task.name) {
            const overwriteResult = await vscode.window.showWarningMessage(`You already has Task '${task.name}'. Do you want to overwrite it?`, 'Overwrite', 'Cancel');
            if (overwriteResult !== 'Overwrite') {
              return false;
            }
            installedVersion = (rawTask.metadata.labels ?? [])['app.kubernetes.io/version'];
            needToUpgrade = true;
          }
        }
      }
      
      let result: CliExitData;
      let message: string;
      if (needToUpgrade){
        if (installedVersion) {
          if (installedVersion === task.resourceVersion.version){
            result = await tkn.execute(Command.hubTaskReinstall(task.name, task.resourceVersion.version))
          } else if (parseFloat(installedVersion) < parseFloat(task.resourceVersion.version)){
            result = await tkn.execute(Command.hubTaskUpgrade(task.name, task.resourceVersion.version));
          } else {
            result = await tkn.execute(Command.hubTaskDowngrade(task.name, task.resourceVersion.version));
          }
        } else {
          result = await tkn.execute(Command.hubTaskReinstall(task.name, task.resourceVersion.version))
        }
      } else {
        result = await tkn.execute(Command.hubInstallTask(task.name, task.resourceVersion.version));
      }

      if (result.error){
        message = `Task installation failed: ${getStderrString(result.error)}`;
        telemetryLogError('tekton.hub', message);
        vscode.window.showWarningMessage(message);
      } else {
        message = `Task ${task.name} installed.`;
        vscode.window.showInformationMessage(message);
        if (task.view && task.view === 'recommendedView'){
          message += ' From recommendation.'
        }
        telemetryLog('tekton.hub.install', message);
        installEventEmitter.fire(task);
        return true;
      }
    } catch (err) {
      telemetryLogError('tekton.hub.catch', err.toString());
      vscode.window.showErrorMessage(err.toString());
    }
    return false;
  });
}

async function doInstallClusterTask(task: HubResourceInstallation): Promise<boolean> {
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
        const content = await fs.readFile(tempFile, {encoding : 'UTF8'});
        const yaml = jsYaml.safeLoadAll(content);
        if (yaml[0]) {
          yaml[0].kind = 'ClusterTask';
          if (!yaml[0].metadata) {
            yaml[0].metadata = [];
          }
          yaml[0].metadata.labels['hub.tekton.dev/catalog'] = 'tekton';
          await fs.writeFile(tempFile, jsYaml.dump(yaml[0]));
        }
      }
      const result = await tkn.execute(Command.apply(tempFile));
      let message: string;
      await fs.unlink(tempFile);
      if (result.error) {
        telemetryLogError('tekton.hub', result.error.toString().replace(tempFile, 'user path'));
        vscode.window.showWarningMessage(`ClusterTask installation failed: ${getStderrString(result.error)}`);
      } else {
        message = `ClusterTask ${task.name} installed.`;
        telemetryLog('tekton.hub.install', message);
        vscode.window.showInformationMessage(message);
        installEventEmitter.fire(task);
        return true;
      }
    } catch (err) {
      telemetryLogError('tekton.hub.catch', err.toString());
      vscode.window.showErrorMessage(err.toString());
    }
    return false;
  });
}
