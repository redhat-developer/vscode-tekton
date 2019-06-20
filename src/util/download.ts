 /*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

'use strict';

import * as fs from 'fs-extra';
import request = require('request');

export class DownloadUtil {
  static downloadFile(fromUrl: string, toFile: string, progressCallBack?: (current: number, increment: number) => void, throttle?: number): Promise<void> {
    return new Promise((resolve, reject) => {
      let previous = 0;
    });
  }
}