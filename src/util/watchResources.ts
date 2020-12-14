/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import * as path from 'path';
import { Platform } from './platform';
import { kubectl, KubectlCommands } from '../kubectl';
import { pipelineExplorer } from '../pipeline/pipelineExplorer';
import { FileContentChangeNotifier, WatchUtil } from './watch';
import { window, workspace } from 'vscode';
import { humanizer } from '../tkn';

export const pipelineTriggerStatus = new Map<string, boolean>();
const kubeConfigFolder: string = path.join(Platform.getUserHomePath(), '.kube');

export enum ResourceType {
  pipelineRun = 'PipelineRun'
}

function checkPipelineRunNotifications(): boolean {
  return workspace
    .getConfiguration('vs-tekton')
    .get<boolean>('pipelineRunNotifications');
}

export class WatchResources {

  public fsw: FileContentChangeNotifier;

  constructor() {
    this.fsw = WatchUtil.watchFileForContextChange(kubeConfigFolder, 'config');
    this.fsw.emitter.on('file-changed', this.contextChange.bind(this));
  }

  async watchCommand(resourceList: string[]): Promise<void> {
    for (const resource of resourceList) {
      this.refreshResources(resource);
    }
  }

  async refreshResources(resourceName: string, id = undefined): Promise<void> {
    await kubectl.watchAllResource(KubectlCommands.watchResources(resourceName), (run) => {
      if (id !== run.metadata.uid) {
        pipelineExplorer.refresh();
      } else if (run.status?.completionTime !== undefined) {
        if (checkPipelineRunNotifications()) {
          if (run.kind === ResourceType.pipelineRun) {
            if (run.status.conditions[0].status === 'True') {
              window.showInformationMessage(`PipelineRun: ${run.metadata.name} is successfully completed. Duration to complete the execution 'Time: ${humanizer(Date.parse(run.status.completionTime) - Date.parse(run.status.startTime))}'`);
            } else if (run.status.conditions[0].status === 'False') {
              window.showErrorMessage(`PipelineRun: ${run.metadata.name} fails. Reason: ${run.status.conditions[0].reason} and Message: ${run.status.conditions[0].message}`);
            }
          }
        }
        pipelineExplorer.refresh();
      }
      id = run.metadata.uid;
    });
  }

  disableWatch(): void {
    pipelineTriggerStatus.set('pipeline', false);
    pipelineTriggerStatus.set('trigger', false);
  }

  contextChange(): void {
    this.disableWatch();
    pipelineExplorer.refresh();
  }
}

export const watchResources = new WatchResources();
