/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { tkn } from '../tkn';
import { HubResourceUninstall } from './hub-common';
import * as vscode from 'vscode';
import { getStderrString } from '../util/stderrstring';
import { Command } from '../cli-command';
import { CliCommand } from '../cli';
import { telemetryLog, telemetryLogError } from '../telemetry';

const uninstallTaskEmitter = new vscode.EventEmitter<HubResourceUninstall>();
export const uninstallTaskEvent = uninstallTaskEmitter.event;

export async function uninstallTask(task: HubResourceUninstall): Promise<void> {
  let command: CliCommand;
  let message: string;
  if (task.kind === 'Task'){
    if (task.clusterTask){
      command = Command.deleteClusterTask(task.name);
    } else {
      command = Command.deleteTask(task.name);
    }
  } else {
    command = Command.deletePipeline(task.name);
  }

  const result = await tkn.execute(command);
  if (result.error){
    message = `Failed to uninstall: : ${getStderrString(result.error)}`;
    telemetryLogError('tekton.hub.uninstall', message);
    vscode.window.showWarningMessage(message);
  } else {
    message = `Resource ${task.name} uninstalled.`;
    telemetryLog('tekton.hub.uninstall', message);
    vscode.window.showInformationMessage(message);
    uninstallTaskEmitter.fire(task);
  }
}
