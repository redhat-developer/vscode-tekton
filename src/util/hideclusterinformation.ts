/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

export function hideClusterInfo(message: string): string {
  const clusterInfo = /lookup\s+([^']+):/;
  if (clusterInfo.test(message)) {
    message = message.replace(clusterInfo, 'lookup cluster info: ');
  }
  return hideClusterUrl(message);
}
  
export function hideClusterUrl(message: string): string {
  const urlCheck = /(https?:\/\/[^\s]+)/g;
  if (urlCheck.test(message)) {
    return message.replace(urlCheck, 'cluster info ');
  }
  return message;
}
