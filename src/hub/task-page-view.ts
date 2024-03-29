/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { contextGlobalState } from '../extension';
import * as path from 'path';
import { Disposable } from '../util/disposable';
import { debounce } from 'debounce';
import { ResourceData } from '../tekton-hub-client';
import { getTaskByVersion, getVersions } from './hub-client';
import { installEvent, installResource } from './install-resource';
import { uninstallTask } from './uninstall-task';
import { HubResource, HubResourceInstallation, HubResourceUninstall, InstalledResource, isInstalledTask } from './hub-common';


export class TaskPageView extends Disposable {
  static viewType = 'tekton.pipeline.start.wizard';
  static title: string;

  public static create(task: HubResource, tknVersion: string, previewColumn: vscode.ViewColumn): TaskPageView {
    TaskPageView.title = getTitle(task);
    const webview = vscode.window.createWebviewPanel(
      'task-view',
      getTitle(task),
      previewColumn,
      {
        enableFindWidget: true,
        ...getWebviewOptions()
      }
    );
    return new TaskPageView(webview, task, tknVersion);
  }

  private webviewPanel: vscode.WebviewPanel;
  private updateFunc = debounce(() => this.doUpdate(), 500);
  private readonly onDisposeEmitter = new vscode.EventEmitter<void>();
  public readonly onDispose = this.onDisposeEmitter.event;
  private readonly onDidChangeViewStateEmitter = new vscode.EventEmitter<vscode.WebviewPanelOnDidChangeViewStateEvent>();
  public readonly onDidChangeViewState = this.onDidChangeViewStateEmitter.event;

  constructor(webview: vscode.WebviewPanel, private resource: HubResource, private tknVersion: string) {
    super();
    this.webviewPanel = webview;
    this.register(this.webviewPanel.onDidDispose(() => {
      this.dispose();
    }));

    this.register(installEvent(e => {
      if (this.resource.name === e.name) {
        (this.resource as InstalledResource).installedVersion = e.resourceVersion;
        (this.resource as InstalledResource).clusterTask = e.asClusterTask;
        this.sendTask();
      }
    }));


    this.register(this.webviewPanel.webview.onDidReceiveMessage(async e => {
      switch (e.type) {
        case 'ready':
          this.sendTask();
          break;
        case 'getVersions':
          this.getTaskVersions(e.data);
          break;
        case 'installTask':
          this.installTask(e.data);
          break;
        case 'getTask': 
          this.getTask(e.data);
          break;
        case 'uninstallTask': 
          this.uninstallTask(e.data);
          break;
        default:
          console.error(`Unknown message received - type: "${e.type}" data: ${JSON.stringify(e.data)}`);
      }
    }));

    this.updateFunc();
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }

    this.onDisposeEmitter.fire();
    this.onDisposeEmitter.dispose();

    this.webviewPanel.dispose();
    super.dispose();
  }

  reveal(viewColumn: vscode.ViewColumn): void {
    this.webviewPanel.reveal(viewColumn);
  }

  update(task: ResourceData): void {
    this.resource = task;
    this.webviewPanel.title = getTitle(task);
    this.sendTask();
  }

  private async installTask(resource: HubResourceInstallation): Promise<void>{
    const isInstalled = await installResource(resource);
    if (isInstalled) {
      (this.resource as InstalledResource).installedVersion = resource.resourceVersion;
      (this.resource as InstalledResource).clusterTask = resource.asClusterTask;
      this.sendTask();
    } else {
      this.postMessage({type: 'cancelInstall'});
    }
  }

  private async uninstallTask(task: HubResourceUninstall): Promise<void>{
    await uninstallTask(task);
    if (isInstalledTask(this.resource)){
      this.resource.installedVersion = undefined;
      this.resource.clusterTask = undefined;
      this.sendTask();
    }
  }

  private async getTaskVersions(id: number): Promise<void>{
    const versions = await getVersions(id);
    this.postMessage({type: 'setVersions', data: versions});
  }

  private async getTask(id: number): Promise<void> {
    const task = await getTaskByVersion(id);
    this.postMessage({type: 'taskVersion', data: task});
  }

  private sendTask(): void {
    this.postMessage({type: 'showTask', data: {task: this.resource, tknVersion: this.tknVersion }});
  }

  private async doUpdate(): Promise<void> {
    if (this.disposed) {
      return;
    }
    const html = this.getHmlContent();
    this.setContent(html);
  }

  private postMessage(message: {type: string; data?: unknown}): void {
    if (!this.disposed) {
      this.webviewPanel.webview.postMessage(message);
    }
  }

  private setContent(html: string): void {
    this.webviewPanel.title = TaskPageView.title;
    this.webviewPanel.webview.options = getWebviewOptions();
    this.webviewPanel.webview.html = html;
  }

  private getHmlContent(): string {
    const nonce = new Date().getTime() + '' + new Date().getMilliseconds();
    const rule = this.webviewPanel.webview.cspSource;
    return `
    <!DOCTYPE html>
      <html lang="en" class="pf-m-redhat-font">
        <head>
         <!-- <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src 'self' ${rule} http: https: data:; media-src 'self' ${rule} http: https: data:; script-src 'nonce-${nonce}'; style-src 'self' ${rule} 'unsafe-inline' http: https: data:; font-src 'self' ${rule} http: https: data:;"> -->
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
        </head>
      <body>
        <div id="root" style="width: 100%; height: 100%;"></div>
        ${this.getScripts(nonce)}
        <div class="hide" id="rmenu" />
      </body>
      </html>`;
  }

  private getScripts(nonce: string): string {
    const out: string[] = [];
    out.push(`<script
        src="${escapeAttribute(this.webviewPanel.webview.asWebviewUri(vscode.Uri.file(path.join(contextGlobalState.extensionPath, '/out/webview/resource-view/index.js'))))}"
        nonce="${nonce}"
        charset="UTF-8"></script>`);
    return out.join('\n');
  }

}

function escapeAttribute(value: string | vscode.Uri): string {
  return value.toString().replace(/"/g, '&quot;');
}


function getWebviewOptions(): vscode.WebviewOptions {
  return {
    enableScripts: true,
    localResourceRoots: getLocalResourceRoots()
  };
}

function getLocalResourceRoots(): vscode.Uri[] {
  return [
    vscode.Uri.file(path.join(contextGlobalState.extensionPath, '/out/webview')),
    vscode.Uri.file(path.join(contextGlobalState.extensionPath, '/images'))
  ];
}

function getTitle(task: ResourceData): string {
  const name = task.latestVersion?.displayName ? task.latestVersion.displayName : task.name;
  return `Task: ${name}`;
}
