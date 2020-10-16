/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { Command, tkn } from '../tkn';


export async function newFileName(contextValue: string, name: string): Promise<string> {
  const result = await tkn.execute(Command.getResources(contextValue, name));
  const resource = JSON.parse(result.stdout);
  const id = new RegExp('^[A-Za-z0-9]+');
  const uid = resource.metadata.uid;
  return `${name}-${uid.match(id)[0]}`;
}
