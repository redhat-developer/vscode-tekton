/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

export interface HubTaskInstallation {
  url: string;
  name: string;
  tknVersion?: string;
  minPipelinesVersion?: string;
  asClusterTask: boolean;
  taskVersion?: string;
}
