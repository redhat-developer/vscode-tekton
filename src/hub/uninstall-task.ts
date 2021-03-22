/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { tkn } from '../tkn';
import { HubTaskUninstall } from './hub-common';
import * as vscode from 'vscode';
import { getStderrString } from '../util/stderrstring';
import { Command } from '../cli-command';

const uninstallTaskEmitter = new vscode.EventEmitter<HubTaskUninstall>();
export const uninstallTaskEvent = uninstallTaskEmitter.event;

export async function uninstallTask(task: HubTaskUninstall): Promise<void> {
  let command;
  if (task.clusterTask){
    command = Command.deleteClusterTask(task.name);
  } else {
    command = Command.deleteTask(task.name);
  }
  const result = await tkn.execute(command);
  if (result.error){
    vscode.window.showWarningMessage(`Failed to uninstall: : ${getStderrString(result.error)}`);
  } else {
    vscode.window.showInformationMessage(`Task ${task.name} uninstalled.`);
    uninstallTaskEmitter.fire(task);
  }
}
