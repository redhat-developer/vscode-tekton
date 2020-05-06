/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import * as path from 'path';
import Mocha = require('mocha');

// Linux: prevent a weird NPE when mocha on Linux requires the window size from the TTY
// Since we are not running in a tty environment, we just implement the method statically
// eslint-disable-next-line @typescript-eslint/no-var-requires
const tty = require('tty');
if (!tty.getWindowSize) {
  tty.getWindowSize = (): number[] => {
    return [80, 75];
  };
}

const config: {} = {
  ui: 'tdd',
  timeout: 15000,
  color: true,
  fullStackTrace: true,
};

const mocha = new Mocha(config);

export function run(testsRoots: string, cb: (error: {}, failures?: number) => void): void {

  const testsRoot = path.resolve(__dirname);
  const testFile = process.env.VSCODE_SINGLE_TEST;

  if (!testFile) {
    cb('Cannot find tests');
    return;
  }
  if (path.extname(testFile) !== '.ts') {
    cb(`Cannot run test from: ${testFile}`);
    return;
  }

  const nFileName = path.basename(testFile, path.extname(testFile)) + '.js';
  const pathSegments = testFile.split(path.sep);


  mocha.addFile(path.join(testsRoot, ...pathSegments.slice(1, -1), nFileName));

  try {
    mocha.run(failures => {
      setTimeout(() => {
        if (failures > 0) {
          cb(new Error(`${failures} tests failed.`));
        } else {
          cb(null, failures);
        }
      }, 100);
    });

  } catch (err) {
    console.error(err);
    cb(err);
  }

}

