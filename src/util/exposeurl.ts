/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import * as _ from 'lodash';
import { tkn } from '../tkn';
import { Command } from './command';



export async function getExposeURl(name: string): Promise<string> {
  const result = await tkn.execute(Command.getRoute(name));
  const route = JSON.parse(result.stdout);
  const scheme = _.get(route, 'spec.tls.termination') ? 'https' : 'http';
  let url = `${scheme}://${route.spec.host}`;
  if (route.spec?.path) {
    url += route.spec.path;
  }
  return url;
}
