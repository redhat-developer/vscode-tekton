/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/
import * as vscode from 'vscode';
import * as path from 'path';
import { Disposable } from '../util/disposable';
import { getTaskById, getTaskByNameAndVersion, getTektonHubStatus, getTopRatedTasks, searchTask, TektonHubStatusEnum } from './hub-client';
import { ResourceData } from '../tekton-hub-client';
import { taskPageManager } from './task-page-manager';
import { installTask, installEvent } from './install-task';
import { version } from '../util/tknversion';
import { getRawTasks } from '../yaml-support/tkn-tasks-provider';
import { InstalledTask, isInstalledTask } from './hub-common';
import { uninstallTaskEvent } from './uninstall-task';


export class TektonHubTasksViewProvider extends Disposable implements vscode.WebviewViewProvider {

  private webviewView: vscode.WebviewView;
  private tknVersion: string | undefined;
  private installedTasks: InstalledTask[] | undefined;

  constructor(
		private readonly extensionUri: vscode.Uri,
  ) {
    super();

    installEvent(async () => {
      if (this.webviewView?.visible) {
        await this.loadInstalledTasks();
        await this.loadRecommendedTasks();
      }
    });

    uninstallTaskEvent(() => {
      if (this.webviewView?.visible) {
        this.loadInstalledTasks();
      }
    });
  }

  resolveWebviewView(webviewView: vscode.WebviewView): void | Thenable<void> {
    this.webviewView = webviewView;
    webviewView.webview.options = {
      enableScripts: true,

      localResourceRoots: [
        vscode.Uri.parse(path.join(this.extensionUri.fsPath, 'out', 'webview', 'tekton-hub', '/')),
        vscode.Uri.parse(path.join(this.extensionUri.fsPath, 'out', 'webview', 'assets', '/')),
      ]
    };

    
    const indexJS = webviewView.webview.asWebviewUri(vscode.Uri.file(path.join(this.extensionUri.fsPath, 'out', 'webview', 'tekton-hub', 'index.js')));

    webviewView.webview.html = this.getHmlContent().replace('{{init}}', indexJS.toString());
    
    this.register(webviewView.webview.onDidReceiveMessage(e => {
      switch (e.type) {
        case 'ready': 
          this.handleReady();
          break;
        case 'search':
          this.doSearch(e.data);
          break;
        case 'openTaskPage': 
          this.openTaskPage(e.data);
          break;
        case 'installTask':
          installTask(e.data);
          break;
      }
    }));
  }

  private getHmlContent(): string {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <title>TektonHub</title>
    </head>
    <body>
      <div id="root" style="width: 100%; height: 100%;">
        <div id="header">
          <input type="text" placeholder="Search Tasks in TektonHub" id="taskInput" />
        </div>
        <div class="listContainer" id="mainContainer">
        </div>
      </div>
      <script type="text/javascript" src="{{init}}"> </script>
    </body>    
    </html>`;
  }


  private sendMessage(message: {type: string; data?: unknown}): void {
    this.webviewView?.webview?.postMessage(message);
  }

  private async handleReady(): Promise<void> {
    const hubAvailable = await this.doCheckHub();
    if (hubAvailable){
      await this.loadInstalledTasks();
      await this.loadRecommendedTasks();
    }
  }

  private async doCheckHub(): Promise<boolean> {
    const status = await getTektonHubStatus();
    const tknVersions = await version();
    this.tknVersion = tknVersions.pipeline;
    
    if (status.status !== TektonHubStatusEnum.Ok){
      this.sendMessage({type: 'error', data: status.error});
      return false;
    } else {
      this.sendMessage({type: 'tknVersion', data: tknVersions.pipeline});
      return true;
    }
  }

  private async doSearch(value: string): Promise<void> {
    try {
      const tasks = await searchTask(value);
      this.sendMessage({type: 'showTasks', data: tasks});
    } catch (err) {
      console.error(err);
    }

  }

  private async loadInstalledTasks(): Promise<void> {
    const rawTasks = await getRawTasks(true);
    const installedTasksRaw = rawTasks.filter( task => {
      if (!task.metadata?.labels){
        return false;
      }
      return task.metadata?.labels['hub.tekton.dev/catalog'] !== undefined;
    });

    const installedTasks: InstalledTask[] = [];
    for (const installedTask of installedTasksRaw) {
      try {
        const installedVersion = await getTaskByNameAndVersion(installedTask.metadata.labels['hub.tekton.dev/catalog'], installedTask.metadata.name, installedTask.metadata.labels['app.kubernetes.io/version']);
        const task: InstalledTask = installedVersion.resource;
        task.installedVersion = installedVersion;
        const tmpTask = Object.assign({}, task);
        tmpTask.installedVersion.resource = undefined;
        tmpTask.clusterTask = installedTask.kind === 'ClusterTask';
        installedTasks.push(tmpTask);
      } catch (err) {
        // ignore errors
      }
    }
    this.installedTasks = installedTasks;
    this.sendMessage({type: 'installedTasks', data: installedTasks});
    return;
  }

  private async openTaskPage(task: ResourceData | InstalledTask): Promise<void> {
    if (isInstalledTask(task)) {
      const taskData: InstalledTask = await getTaskById(task.id);
      taskData.installedVersion = task.installedVersion;
      task = taskData;
    }
    taskPageManager.showTaskPageView(task, this.tknVersion);
  }

  private async loadRecommendedTasks(): Promise<void> {
    try {
      const recommendedTasks = await getTopRatedTasks(7);
      let result = [];
      if (this.installedTasks) {
        const installedId = this.installedTasks.map((it) => it.id);

        for (const task of recommendedTasks) {
          if (installedId.indexOf(task.id) === -1) {
            result.push(task);
          }
        }
      } else {
        result = recommendedTasks;
      }

      this.sendMessage({type: 'recommendedTasks', data: result});
    } catch (err){
      console.error(err);
    }

  }

}

