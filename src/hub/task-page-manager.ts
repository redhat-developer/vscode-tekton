/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/
import { ViewColumn } from 'vscode';
import { Disposable } from '../util/disposable';
import { HubResource } from './hub-common';
import { TaskPageView } from './task-page-view';




export class TaskPageManager extends Disposable {

  private activePreview: TaskPageView | undefined = undefined;

  constructor() {
    super();
  }

  showTaskPageView(task: HubResource, tknVersion: string): void {
    if (!this.activePreview){
      this.createTaskPageView(task, tknVersion);

    } else {
      this.activePreview.update(task);
    }
  }

  createTaskPageView(task: HubResource, tknVersion: string): TaskPageView {
    const preview = TaskPageView.create(task, tknVersion, ViewColumn.One);

    this.activePreview = preview;
    return this.registerPipelinePreview(preview);
  }

  private registerPipelinePreview(preview: TaskPageView): TaskPageView {

    this.trackActive(preview);
    return preview;
  }

  private trackActive(preview: TaskPageView): void {
    preview.onDidChangeViewState(({ webviewPanel }) => {
      this.activePreview = webviewPanel.active ? preview : undefined;
    });

    preview.onDispose(() => {
      if (this.activePreview === preview) {
        this.activePreview = undefined;
      }
    });
  }

}

export const taskPageManager = new TaskPageManager();
