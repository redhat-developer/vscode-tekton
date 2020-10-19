/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

export function newFileName(name: string, uid: string): string {
  const id = new RegExp('^[A-Za-z0-9]+');
  return `${name}-${uid.match(id)[0]}`;
}
