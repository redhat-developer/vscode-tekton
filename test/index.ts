
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

let testFinishTimeout = 1000;
if (process.env.TRAVIS && process.platform === 'darwin') {
  testFinishTimeout = 7000; // for macOS on travis we need bigger timeout
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

export function run(): Promise<void> {
  return new Promise((resolve, reject) => {
    const testsRoot = paths.resolve(__dirname);
    const coverageRunner = loadCoverageRunner(testsRoot);
    glob('**/**.test.js', { cwd: testsRoot }, (error, files): any => {
      if (error) {
        reject(error);
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
          let testFailures;
          mocha.run(failures => {
            testFailures = failures;
          }).on('end', () => {
            coverageRunner && coverageRunner.reportCoverage();
            // delay reporting that test are finished, to let main process handle all output
            setTimeout(() => {
              if (testFailures > 0) {
                reject(new Error(`${testFailures} tests failed.`));
              } else {
                resolve();
              }
            }, testFinishTimeout);
          });

        } catch (err) {
          console.error(err);
          reject(err);
        }

      }
    });
  });

}
