/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { newK8sCommand, PipelineRunData } from './tkn';
import { CliImpl, CliCommand } from './cli';

export const KubectlCommands = {
  watchPipelineRuns(name: string): CliCommand {
    return newK8sCommand('get', 'pipelinerun', name, '-w', '-o', 'json');
  }
}

export type PipelineRunCallback = (pr: PipelineRunData) => void;

export class Kubectl {
  watchPipelineRun(name: string, callback?: PipelineRunCallback): Promise<void> {
    return new Promise((resolve, reject) => {
      const watch = CliImpl.getInstance().executeWatchJSO(KubectlCommands.watchPipelineRuns(name));
      watch.on('object', obj => {
        if (callback) {
          callback(obj);
        }
        if (obj.status?.completionTime !== undefined) {
          watch.kill(); // PipelineRun finished
        }
      });

      watch.stderr.on('data', data => {
        reject(data); // TODO: better error handling
      });

      watch.on('close', code => {
        if (code == 0) {
          resolve();
        } else {
          reject(`Watch command exited with code: ${code}`);
        }
      })
    });
  }
}

export const kubectl = new Kubectl();
