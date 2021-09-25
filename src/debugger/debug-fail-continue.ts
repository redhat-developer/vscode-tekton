/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { window } from 'vscode';
import { cli } from '../cli';
import { Command } from '../cli-command';
import { telemetryLogError } from '../telemetry';
import { TektonNode } from '../tree-view/tekton-node';
import { getStderrString } from '../util/stderrstring';
import { sessions } from './debug-tree-view';


export async function showDebugFailContinue(taskRun: TektonNode, commandId?: string): Promise<void> {
  if (!taskRun) return null;
  try {
    const continueTaskRun = sessions.get(taskRun.getName());
    await cli.execute(Command.debugFailContinue(continueTaskRun.containerName, continueTaskRun.podName, continueTaskRun.namespace));
  } catch (error) {
    telemetryLogError(commandId, `Fail to debug fail continue ${getStderrString(error)}.`);
    window.showInformationMessage(`Fail to debug fail continue ${getStderrString(error)}.`);
    return;
  }
}
