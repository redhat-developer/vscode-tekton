/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/
/* eslint-disable @typescript-eslint/camelcase */


import { cli } from './cli';
import { Command } from './cli-command';

interface Versions {
  openshift_Version: string;
  kubernetes_Version: string;
}

export async function getClusterVersions(): Promise<Versions> {
  const result = await cli.execute(Command.printOcVersionJson());
  const versions: Versions = {
    kubernetes_Version: undefined,
    openshift_Version: undefined
  };
  if (!result.error) {
    try {
      const versionsJson = JSON.parse(result.stdout);
      if (versionsJson?.serverVersion?.major && versionsJson?.serverVersion?.minor) {
        versions.kubernetes_Version = `${versionsJson.serverVersion.major}.${versionsJson.serverVersion.minor}`;
      }
      if (versionsJson?.openshiftVersion) {
        versions.openshift_Version = versionsJson.openshiftVersion;
      }

    } catch (err) {
      // ignore and return undefined
    }
  }
  return versions;
}
