/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { CliCommand, cli} from './cli';
import { newK8sCommand, newOcCommand } from './cli-command';
import { PipelineRunData, PipelineTaskRunData, TknTaskRun } from './tekton';
import { ocFallBack } from './util/check-cluster-status';

export const KubectlCommands = {
  watchPipelineRuns(name: string): CliCommand {
    if (ocFallBack.get('ocFallBack')) {
      return newOcCommand('get', 'pipelinerun', name, '-w', '-o', 'json');
    } else {
      return newK8sCommand('get', 'pipelinerun', name, '-w', '-o', 'json');
    }
  },
  watchResources(resource: string): CliCommand {
    if (ocFallBack.get('ocFallBack')) {
      return newOcCommand('get', resource, '-w', '-o', 'json');
    } else {
      return newK8sCommand('get', resource, '-w', '-o', 'json');
    }
  }
}

export type PipelineRunCallback = (pr: PipelineRunData) => void;
export type TaskRunCallback = (pr: TknTaskRun) => void;
export type watchAllPipelineAndTriggerResources = (pr: PipelineRunData | TknTaskRun) => void;

export interface WatchControl {
  kill(): void;
  waitFinish(): Promise<void>;
  terminated: boolean;
}

export class Kubectl {

  watchAllResource(command: CliCommand, callback?: watchAllPipelineAndTriggerResources): Promise<void> {
    return new Promise((resolve, reject) => {
      const watch = cli.executeWatchJSON(command);
      watch.on('object', obj => {
        if (callback) {
          callback(obj);
        }
      });

      watch.stderr.on('data', data => {
        console.error(data.toString());
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

  watchRunCommand(command: CliCommand, callback?: PipelineRunCallback | TaskRunCallback): Promise<void> {
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
        console.error(data.toString());
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

  watchPipelineRunWithControl(name: string, callback?: PipelineRunCallback | TaskRunCallback): WatchControl {
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
        console.error(data.toString());
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
