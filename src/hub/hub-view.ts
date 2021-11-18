/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/
import * as vscode from 'vscode';
import { Disposable } from '../util/disposable';
import { getPipelineByNameAndVersion, getTaskById, getTaskByNameAndVersion, getTektonHubStatus, getTopRatedTasks, listTasks, searchTask, TektonHubStatusEnum } from './hub-client';
import { ResourceData } from '../tekton-hub-client';
import { taskPageManager } from './task-page-manager';
import { installResource, installEvent } from './install-resource';
import { version } from '../util/tknversion';
import { getRawTasks } from '../yaml-support/tkn-tasks-provider';
import { HubResourceInstallation, InstalledResource, isInstalledTask } from './hub-common';
import { uninstallTaskEvent } from './uninstall-task';
import { startDetectingLanguage } from './hub-recommendation';
import * as fuzzysort from 'fuzzysort';
import { getPipelineList } from '../util/list-tekton-resource';

const MAX_RECOMMENDED_TASK = 7;

export class TektonHubTasksViewProvider extends Disposable implements vscode.WebviewViewProvider {

  private webviewView: vscode.WebviewView;
  private tknVersion: string | undefined;
  private installedResources: InstalledResource[] | undefined;

  constructor(
    private readonly extensionUri: vscode.Uri,
  ) {
    super();

    installEvent(async () => {
      if (this.webviewView?.visible) {
        await this.loadInstalledResources();
        await this.loadRecommendedTasks();
      }
    });

    uninstallTaskEvent(() => {
      if (this.webviewView?.visible) {
        this.loadInstalledResources();
      }
    });
  }

  resolveWebviewView(webviewView: vscode.WebviewView): void | Thenable<void> {
    this.webviewView = webviewView;
    webviewView.webview.options = {
      enableScripts: true,

      localResourceRoots: [
        vscode.Uri.joinPath(this.extensionUri, 'out', 'webview', 'tekton-hub', '/'),
        vscode.Uri.joinPath(this.extensionUri, 'out', 'webview', 'assets', '/'),
      ]
    };

    
    const indexJS = webviewView.webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'out', 'webview', 'tekton-hub', 'index.js'));

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
          this.doInstallTask(e.data);
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
        <ul class="ul-color select-list-group" id="slg">
          <li class="li-style">
              <input type="text" placeholder="Search for resources..." id="taskInput" />
              <ul class="ul-color ul-position" data-toggle="false">
                <li class="li-style" data-display="true">@tag:</li>
                <li class="li-style" data-display="true">@categories:</li>
              </ul>
          </li>
        </ul>
        </div>
        <div class="listContainer" id="mainContainer">
        </div>
      </div>
      <script type="text/javascript" src="{{init}}"> </script>
    </body>    
    </html>`;
  }


  private sendMessage(message: { type: string; data?: unknown }): void {
    this.webviewView?.webview?.postMessage(message);
  }

  private async handleReady(): Promise<void> {
    try {
      const hubAvailable = await this.doCheckHub();
      if (hubAvailable) {
        await this.loadInstalledResources();
        await this.loadRecommendedTasks();
      }
    } catch (err) {
      console.error(err);
    }

  }

  private async doCheckHub(): Promise<boolean> {
    const status = await getTektonHubStatus();
    const tknVersions = await version();
    if (!tknVersions) {
      this.sendMessage({ type: 'error', data: 'Cannot detect Tekton Pipelines version' });
      return false;
    }
    this.tknVersion = tknVersions.pipeline;

    if (status.status !== TektonHubStatusEnum.Ok) {
      this.sendMessage({ type: 'error', data: status.error });
      return false;
    } else {
      this.sendMessage({ type: 'tknVersion', data: tknVersions.pipeline });
      return true;
    }
  }

  private async doSearch(value: string): Promise<void> {
    try {
      const tasks = await searchTask(value);
      this.sendMessage({ type: 'showTasks', data: tasks });
    } catch (err) {
      console.error(err);
    }

  }

  private async doInstallTask(task: HubResourceInstallation): Promise<void> {
    const result = await installResource(task);
    if (!result){
      this.sendMessage({type: 'cancelInstall'});
    }
  }

  private async loadInstalledResources(): Promise<void> {
    const rawTasks = await getRawTasks(true);
    const installedTasksRaw = rawTasks.filter(task => {
      if (!task.metadata?.labels) {
        return false;
      }
      return task.metadata?.labels['hub.tekton.dev/catalog'] !== undefined;
    });

    const installedResources: InstalledResource[] = [];
    for (const installedTask of installedTasksRaw) {
      try {
        const installedVersion = await getTaskByNameAndVersion(installedTask.metadata.labels['hub.tekton.dev/catalog'], installedTask.metadata.name, installedTask.metadata.labels['app.kubernetes.io/version']);
        const task: InstalledResource = installedVersion.resource;
        task.installedVersion = installedVersion;
        const tmpTask = Object.assign({}, task);
        tmpTask.installedVersion.resource = undefined;
        tmpTask.clusterTask = installedTask.kind === 'ClusterTask';
        installedResources.push(tmpTask);
      } catch (err) {
        // ignore errors
      }
    }
    const rawPipelines = await getPipelineList();
    const installedPipelineRaw = rawPipelines.filter(pipeline => {
      if (!pipeline.metadata?.labels) {
        return false;
      }
      return pipeline.metadata?.labels['hub.tekton.dev/catalog'] !== undefined;
    });

    for (const installedPipeline of installedPipelineRaw) {
      try {
        const installedVersion = await getPipelineByNameAndVersion(installedPipeline.metadata.labels['hub.tekton.dev/catalog'], installedPipeline.metadata.name, installedPipeline.metadata.labels['app.kubernetes.io/version']);
        const task: InstalledResource = installedVersion.resource;
        task.installedVersion = installedVersion;
        const tmpPipeline = Object.assign({}, task);
        tmpPipeline.installedVersion.resource = undefined;
        installedResources.push(tmpPipeline);
      } catch (err) {
        // ignore errors
      }
    }

    this.installedResources = installedResources;
    this.sendMessage({ type: 'installedResources', data: installedResources });
  }

  private async openTaskPage(task: ResourceData | InstalledResource): Promise<void> {
    if (isInstalledTask(task)) {
      const taskData: InstalledResource = await getTaskById(task.id);
      taskData.installedVersion = task.installedVersion;
      taskData.clusterTask = task.clusterTask;
      task = taskData;
    }
    taskPageManager.showTaskPageView(task, this.tknVersion);
  }

  private async loadRecommendedTasks(): Promise<void> {
    try {
      const usedTools = await startDetectingLanguage();
      const recommendedTasks = [];
      if (usedTools) {
        let taskList = await listTasks();
        taskList = taskList.map(it => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (it as any).displayName = it.latestVersion.displayName;
          return it;
        });
        for (const toolName of usedTools) {
          const sortResult = fuzzysort
            .go(toolName, taskList, { keys: ['name', 'displayName'] })
            .map((resource) => resource.obj);
          recommendedTasks.push(...sortResult);
          if (recommendedTasks.length >= MAX_RECOMMENDED_TASK) {
            break;
          }
        }
      } else {
        recommendedTasks.push(...await getTopRatedTasks(MAX_RECOMMENDED_TASK));
      }
      let result = [];
      if (this.installedResources) {
        const installedId = this.installedResources.map((it) => it.id);

        for (const task of recommendedTasks) {
          if (installedId.indexOf(task.id) === -1) {
            result.push(task);
          }
        }
      } else {
        result = recommendedTasks;
      }

      this.sendMessage({ type: 'recommendedTasks', data: result });
    } catch (err) {
      console.error(err);
    }

  }

}

