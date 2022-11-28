/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { Command } from './cli-command';
import { tkn } from './tkn';

export interface clusterVersion {
  items: [
    {
      status: {
        desired: {
          version: string;
        };
      };
    },
  ];
}

export async function checkOpenShiftCluster(): Promise<clusterVersion> {
  try {
    const result = await tkn.execute(Command.checkOcpCluster(), process.cwd(), false);
    if (result?.stdout?.trim()) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return JSON.parse(result?.stdout);
    }
    return null;
  } catch (err) {
    return null;
  }
}
