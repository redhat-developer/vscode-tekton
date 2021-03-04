/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

const clusterInfo = /lookup\s+([^']+):/;
export function hideClusterInfo(message: string): string {
  if (clusterInfo.test(message)) {
    message = message.replace(clusterInfo, 'lookup cluster info: ');
  }
  return hideClusterUrl(message);
}

const urlCheck = /(https?:\/\/[^\s]+)/g;
export function hideClusterUrl(message: string): string {
  if (urlCheck.test(message)) {
    return message.replace(urlCheck, 'cluster info ');
  }
  return message;
}
