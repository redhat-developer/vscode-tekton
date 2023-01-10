/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/


import { cli } from './cli';
import { Command } from './cli-command';

interface Versions {
  openshift_Version: string;
  kubernetes_Version: string;
}

export async function getClusterVersions(): Promise<Versions> {
  const ocpServerVersion = await getOcpServerVersion();
  const kubectlVersion = await getK8sServerVersion();
  return {
    kubernetes_Version: kubectlVersion,
    openshift_Version: ocpServerVersion
  };
}

async function getK8sServerVersion(): Promise<string> {
  const kubectlVersion = await cli.execute(Command.kubectlVersion()); 
  if (kubectlVersion.stdout) {
    try {
      const versionsJson = JSON.parse(kubectlVersion.stdout);
      if (versionsJson?.serverVersion?.major && versionsJson?.serverVersion?.minor) {
        return `${versionsJson.serverVersion.major}.${versionsJson.serverVersion.minor}`;
      }
    } catch (err) {
      // ignore and return undefined
    }
  }
  return undefined;
}

async function getOcpServerVersion(): Promise<string> {
  const result = await cli.execute(Command.getOcpServerVersion());
  if (!result.error) {
    try {
      const versionsJson = JSON.parse(result.stdout);
      if (versionsJson?.status?.versions?.[0]?.version) {
        return versionsJson.status.versions[0].version;
      }
    } catch (err) {
      // ignore and return undefined
    }
  }
  return undefined;
}
