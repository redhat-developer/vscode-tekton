/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { tkn } from '../tkn';
import { Command } from './command';

export interface TknVersion {
  trigger?: string;
  tkn?: string;
  pipeline?: string;
}

const versionType = {
  'Triggers version': 'trigger',
  'Client version': 'tkn',
  'Pipeline version': 'pipeline'
}

export const tektonVersionType = {
  'trigger': 'Triggers version',
  'tkn': 'Client version',
  'pipeline': 'Pipeline version'
}

export async function version(): Promise<TknVersion | null> {
  const result = await tkn.execute(Command.printTknVersion(), process.cwd(), false);
  if (result.error) {
    return null;
  }
  return getVersion(result.stdout);
}

export function getVersion(tektonVersion: string): TknVersion {
  const tknVersion = {};
  const version = new RegExp('^(Triggers version|Client version|Pipeline version):\\s[v]?(unknown|[0-9]+\\.[0-9]+\\.[0-9]+)$');
  if (tektonVersion) {
    tektonVersion.trim().split('\n').filter((value) => {
      if (value.match(version)) {
        tknVersion[versionType[value.match(version)[1]]] = value.match(version)[2];
      }
    });
    return tknVersion;
  }
}
