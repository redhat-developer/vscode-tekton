
/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/
'use strict';

require('source-map-support').install();

/* eslint-disable @typescript-eslint/no-explicit-any */
import * as fs from 'fs';
import * as glob from 'glob';
import * as paths from 'path';
import Mocha = require('mocha');
import { TestRunnerOptions, CoverageRunner } from './coverage';


// Linux: prevent a weird NPE when mocha on Linux requires the window size from the TTY
// Since we are not running in a tty environment, we just implement the method statically
// eslint-disable-next-line @typescript-eslint/no-var-requires
const tty = require('tty');
if (!tty.getWindowSize) {
  tty.getWindowSize = (): number[] => {
    return [80, 75];
  };
}

const config: any = {
  ui: 'tdd',
  timeout: 15000,
  color: true,
  fullStackTrace: true,
};

if (process.env.BUILD_ID && process.env.BUILD_NUMBER) {
  config.reporter = 'mocha-jenkins-reporter';
}

const mocha = new Mocha(config);

function loadCoverageRunner(testsRoot: string): CoverageRunner | undefined {
  let coverageRunner: CoverageRunner;
  const coverConfigPath = paths.join(testsRoot, '..', '..', 'coverconfig.json');
  if (!process.env.VST_DISABLE_COVERAGE && fs.existsSync(coverConfigPath)) {
    coverageRunner = new CoverageRunner(JSON.parse(fs.readFileSync(coverConfigPath, 'utf-8')) as TestRunnerOptions, testsRoot);
    coverageRunner.setupCoverage();
  }
  return coverageRunner;
}

export function run(testsRoots: string, cb: (error: any, failures?: number) => void): void {

  const testsRoot = paths.resolve(__dirname);
  const coverageRunner = loadCoverageRunner(testsRoot);
  glob('**/**.test.js', { cwd: testsRoot }, (error, files): any => {
    if (error) {
      cb(error);
    } else {
      // always run extension.test.js first
      files = files.sort((a, b) => {
        if (a === 'extension.test.js') {
          return -1;
        }
        if (b === 'extension.test.js') {
          return 1;
        }

        return a.localeCompare(b);
      });

      files.forEach((f): Mocha => {
        return mocha.addFile(paths.join(testsRoot, f))
      });

      try {
        mocha.run(failures => {
          if (failures > 0) {
            cb(new Error(`${failures} tests failed.`));
          } else {
            cb(null, failures);
          }
        }).on('end', () => {
          coverageRunner && coverageRunner.reportCoverage();
        });

      } catch (err) {
        console.error(err);
        cb(err);
      }

    }
  });
}
