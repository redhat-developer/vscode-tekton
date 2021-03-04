/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

export function getStderrString(data: string | Error): string {
  if (data instanceof Error) {
    return data.message;
  } else if ((typeof data === 'string')) {
    return data;
  }
}
