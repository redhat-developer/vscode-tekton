/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { Disposable } from '../util/disposable';
import { getTektonHubStatus, searchTask, TektonHubStatusEnum } from './hub-client';
import { ResourceData } from '../tekton-hub-client';
import { taskPageManager } from './task-page-manager';
import { installTask } from './install-task';
import { version } from '../util/tknversion';


export class TektonHubTasksViewProvider extends Disposable implements vscode.WebviewViewProvider {

  private webviewView: vscode.WebviewView;
  private tknVersion: string | undefined;

  constructor(
		private readonly extensionUri: vscode.Uri,
  ) {
    super();
  }

  resolveWebviewView(webviewView: vscode.WebviewView): void | Thenable<void> {
    this.webviewView = webviewView;
    webviewView.webview.options = {
      enableScripts: true,

      localResourceRoots: [
        vscode.Uri.parse(path.join(this.extensionUri.fsPath, 'src', 'webview', 'hub','/')),
        vscode.Uri.parse(path.join(this.extensionUri.fsPath, 'out', 'webview', 'tekton-hub', '/')),
        vscode.Uri.parse(path.join(this.extensionUri.fsPath, 'out', 'webview', 'assets', '/')),
      ]
    };

    const pagePath = path.join(this.extensionUri.fsPath, 'src', 'webview', 'hub', 'index.html');
    const indexJS = webviewView.webview.asWebviewUri(vscode.Uri.file(path.join(this.extensionUri.fsPath, 'out', 'webview', 'tekton-hub', 'index.js')));

    webviewView.webview.html = fs
      .readFileSync(pagePath, 'utf-8')
      .replace('{{init}}', indexJS.toString());
    
    this.register(webviewView.webview.onDidReceiveMessage(e => {
      switch (e.type) {
        case 'ready': 
          this.doCheckHub();
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


  private sendMessage(message: {type: string; data?: unknown}): void {
    this.webviewView?.webview?.postMessage(message);
  }

  private async doCheckHub(): Promise<void> {
    const status = await getTektonHubStatus();
    const tknVersions = await version();
    this.tknVersion = tknVersions.pipeline;
    
    if (status.status !== TektonHubStatusEnum.Ok){
      this.sendMessage({type: 'error', data: status.error});
    } else {
      this.sendMessage({type: 'tknVersion', data: tknVersions.pipeline})
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

  private openTaskPage(task: ResourceData): void {
    taskPageManager.showTaskPageView(task, this.tknVersion);
  }

}
