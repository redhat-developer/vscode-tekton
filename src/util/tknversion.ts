/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { Command, tkn } from '../tkn';

export interface TknVersion {
  trigger?: string;
  tkn?: string;
  pipeline?: string;
}


export async function version(): Promise<TknVersion | null> {
  const tknVersion = {};
  const versionType = {
    'Triggers version': 'trigger',
    'Client version': 'tkn',
    'Pipeline version': 'pipeline'
  }
  const result = await tkn.execute(Command.printTknVersion(), process.cwd(), false);
  if (result.error) {
    return null;
  }
  const version = new RegExp('^(Triggers version|Client version|Pipeline version):\\s[v]?(unknown|[0-9]+\\.[0-9]+\\.[0-9]+)$');
  if (result.stdout) {
    result.stdout.trim().split('\n').filter((value) => {
      if (value.match(version)) {
        tknVersion[versionType[value.match(version)[1]]] = value.match(version)[2];
      }
    });
    return tknVersion;
  }
}
