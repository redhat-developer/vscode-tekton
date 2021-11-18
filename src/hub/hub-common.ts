/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { ResourceData, ResourceVersionData } from '../tekton-hub-client/api';

export interface HubResourceInstallation {
  url: string;
  name: string;
  kind: string;
  tknVersion?: string;
  minPipelinesVersion?: string;
  asClusterTask: boolean;
  resourceVersion?: ResourceVersionData;
  view: string;
}

export interface HubResourceUninstall {
  name: string;
  kind: string;
  clusterTask: boolean;
}

export interface InstalledResource extends ResourceData {
  installedVersion?: ResourceVersionData;
  clusterTask?: boolean;
}

export type HubResource = (InstalledResource | ResourceData) & { view?: string }

export function isInstalledTask(task: HubResource): task is InstalledResource {
  return (task as InstalledResource).installedVersion !== undefined;
}
