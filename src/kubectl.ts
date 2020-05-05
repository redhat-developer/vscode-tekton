/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { newK8sCommand } from './tkn';
import { CliCommand, cli} from './cli';
import { PipelineRunData } from './tekton';

export const KubectlCommands = {
  watchPipelineRuns(name: string): CliCommand {
    return newK8sCommand('get', 'pipelinerun', name, '-w', '-o', 'json');
  }
}

export type PipelineRunCallback = (pr: PipelineRunData) => void;

export interface WatchControl {
  kill(): void;
  waitFinish(): Promise<void>;
  terminated: boolean;
}

export class Kubectl {
  watchRunCommand(command: CliCommand, callback?: PipelineRunCallback): Promise<void> {
    return new Promise((resolve, reject) => {
      const watch = cli.executeWatchJSON(command);
      watch.on('object', obj => {
        if (callback) {
          callback(obj);
        }
        if (obj.status?.completionTime !== undefined) {
          watch.kill(); // PipelineRun finished
          resolve();
        }
      });

      watch.stderr.on('data', data => {
        console.error(data);
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

  watchPipelineRunWithControl(name: string, callback?: PipelineRunCallback): WatchControl {
    const watch = cli.executeWatchJSON(KubectlCommands.watchPipelineRuns(name));
    const finish = new Promise<void>((resolve, reject) => {
      watch.on('object', obj => {
        if (callback) {
          callback(obj);
        }
        if (obj.status?.completionTime !== undefined) {
          watch.kill(); // PipelineRun finished
          resolve();
        }
      });

      watch.stderr.on('data', data => {
        console.error(data);
      });

      watch.on('close', code => {
        if (code == 0) {
          resolve();
        } else {
          reject(`Watch command exited with code: ${code}`);
        }
      })
    });

    return {
      waitFinish: () => finish,
      kill: watch.kill,
      terminated: watch.killed
    }
  }
}

export const kubectl = new Kubectl();
