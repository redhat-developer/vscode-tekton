/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { window } from 'vscode';
import { Command } from '../cli-command';
import { telemetryLog } from '../telemetry';
import { tkn } from '../tkn';
import { TektonNode } from '../tree-view/tekton-node';
import { debugSessions } from '../util/map-object';

export async function openContainerInTerminal(taskRun: TektonNode, commandId?: string): Promise<void> {
  if (!taskRun) return null;
  const activeTerminal = window.terminals;
  activeTerminal.map((terminal) => {
    if (terminal.name.trim() === `Tekton:${taskRun.getName()}`) {
      terminal.dispose();
    }
  });
  const debugTaskRun = debugSessions.get(taskRun.getName());
  telemetryLog(commandId, 'Open container in terminal command click')
  tkn.executeInTerminal(Command.loginToContainer(debugTaskRun.containerName, debugTaskRun.podName, debugTaskRun.namespace), debugTaskRun.resourceName);
}
