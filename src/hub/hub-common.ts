/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { ResourceData, ResourceVersionData } from '../tekton-hub-client/api';

export interface HubTaskInstallation {
  url: string;
  name: string;
  tknVersion?: string;
  minPipelinesVersion?: string;
  asClusterTask: boolean;
  taskVersion?: ResourceVersionData;
  view: string;
}

export interface HubTaskUninstall {
  name: string;
  clusterTask: boolean;
}

export interface InstalledTask extends ResourceData {
  installedVersion?: ResourceVersionData;
  clusterTask?: boolean;
}

export type HubTask = (InstalledTask | ResourceData) & { view?: string }

export function isInstalledTask(task: HubTask): task is InstalledTask {
  return (task as InstalledTask).installedVersion !== undefined;
}
