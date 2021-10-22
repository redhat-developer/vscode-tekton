/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { window } from 'vscode';
import { Command } from '../cli-command';
import { telemetryLogError } from '../telemetry';
import { tkn } from '../tkn';
import { TektonNode } from '../tree-view/tekton-node';
import { debugSessions } from '../util/map-object';
import { getStderrString } from '../util/stderrstring';

export async function showDebugFailContinue(taskRun: TektonNode, commandId?: string): Promise<void> {
  if (!taskRun) return null;
  const continueTaskRun = debugSessions.get(taskRun.getName());
  const result = await tkn.execute(Command.debugFailContinue(continueTaskRun.containerName, continueTaskRun.podName, continueTaskRun.namespace), process.cwd(), false);
  if (result.error && !result.stdout) {
    telemetryLogError(commandId, `Fail to debug fail continue ${getStderrString(result.error)}.`);
    window.showErrorMessage(`Fail to debug fail continue ${getStderrString(result.error)}.`);
    return null;
  }
}
