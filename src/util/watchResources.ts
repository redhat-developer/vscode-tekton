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
import { getResourceList } from './list-tekton-resource';
import { telemetryLog, telemetryLogError } from '../telemetry';
import { humanizer } from '../humanizer';
import { TknVersion, version } from './tknversion';
import semver = require('semver');
import { checkEnableApiFields, FeatureFlag } from '../debugger/debug';
import { watchTaskRunContainer } from '../debugger/debug-tree-view';
import { debugName, pipelineTriggerStatus } from './map-object';

export const treeRefresh = new Map<string, boolean>();
const kubeConfigFolder: string = path.join(Platform.getUserHomePath(), '.kube');

export enum ResourceType {
  pipelineRun = 'PipelineRun'
}

const telemetryWatchResource = {
  'Pipeline': true,
  'Task': true,
  'ClusterTask': true,
  'PipelineResource': true,
  'TriggerTemplate': true,
  'TriggerBinding': true,
  'EventListener': true,
  'ClusterTriggerBinding': true
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

  async collectResourceUidAtStart(resource: string, resourceUidAtStart: { [x: string]: boolean}): Promise<void> {
    const resourceList = await getResourceList(resource);
    for (const item of resourceList) {
      resourceUidAtStart[item.metadata.uid] = true;
    }
  }

  async watchCommand(resourceList: string[], resourceUidAtStart: {}): Promise<void> {
    for (const resource of resourceList) {
      await this.collectResourceUidAtStart(resource, resourceUidAtStart);
      this.refreshResources(resource, resourceUidAtStart);
    }
  }

  async refreshResources(resourceName: string, resourceUidAtStart: { [x: string]: boolean}, id = undefined): Promise<void> {
    const getNewELSupport: TknVersion = await version();
    const supportedDebugPipelineVersion = '0.26.0';
    await kubectl.watchAllResource(KubectlCommands.watchResources(resourceName), async (run) => {
      if (!resourceUidAtStart[run.metadata.uid] && id !== run.metadata.uid) {
        if (telemetryWatchResource[run.kind]) {
          telemetryLog(`tekton.watch.create.${run.kind}`, `New tekton resource successfully created ${run.kind}: ${run.metadata.name}`)
        }
        if (treeRefresh.get('treeRefresh')) {
          treeRefresh.set('treeRefresh', false);
          pipelineExplorer.refresh();
        }
      } else if (run.status?.completionTime !== undefined && !(resourceUidAtStart[run.metadata.uid] && (run.status?.conditions?.[0].status === 'False' || run.status?.conditions?.[0].status === 'True'))) {
        if (checkPipelineRunNotifications()) {
          if (run.kind === ResourceType.pipelineRun) {
            if (run.status?.conditions[0].status === 'True') {
              const successfulPipelineRun = `PipelineRun: ${run.metadata.name} is successfully completed. Duration to complete the execution 'Time: ${humanizer(Date.parse(run.status.completionTime) - Date.parse(run.status.startTime))}'`;
              telemetryLog('watch.pipelineRun.complete.status', successfulPipelineRun);
              window.showInformationMessage(successfulPipelineRun);
            } else if (run.status?.conditions[0].status === 'False') {
              const failPipelineRun = `PipelineRun: ${run.metadata.name} fails. Reason: ${run.status.conditions?.[0].reason} and Message: ${run.status.conditions?.[0].message}`;
              telemetryLogError('watch.pipelineRun.error', failPipelineRun)
              window.showErrorMessage(failPipelineRun);
            }
          }
        }
        if (treeRefresh.get('treeRefresh')) {
          treeRefresh.set('treeRefresh', false);
          pipelineExplorer.refresh();
        }
      } else if (run.kind === 'TaskRun' && run.spec?.['debug'] && semver.satisfies(supportedDebugPipelineVersion, `<=${getNewELSupport?.pipeline}`) && run.status?.conditions[0]?.status === 'Unknown') {
        const featureFlagData: FeatureFlag = await checkEnableApiFields();
        if (!featureFlagData) return null;
        if (featureFlagData.data['enable-api-fields'] === 'alpha') {
          if (!debugName.get(run.metadata.name)) {
            debugName.set(run.metadata.name, true);
            watchTaskRunContainer(run.metadata.name, run.kind);
          }
        }
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
