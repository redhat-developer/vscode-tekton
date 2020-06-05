/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

export class TimeoutError extends Error {
  constructor(url, ms, ...params) {
    super(`Call to ${url} timed out after ${ms}ms.`, ...params);
    // Dumb hack to fix `instanceof TimeoutError`
    Object.setPrototypeOf(this, TimeoutError.prototype);
  }
}
