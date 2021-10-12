/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { window } from 'vscode';
import { Command } from '../cli-command';
import { TknTaskRun } from '../tekton';
import { telemetryLog } from '../telemetry';
import { tkn } from '../tkn';
import { TektonNode } from '../tree-view/tekton-node';

export async function openContainerInTerminal(taskRun: TektonNode, commandId?: string): Promise<void> {
  if (!taskRun) return null;
  const activeTerminal = window.terminals;
  activeTerminal.map((terminal) => {
    if (terminal.name.trim() === `Tekton:${taskRun.getName()}`) {
      terminal.dispose();
    }
  });
  const result = await tkn.execute(Command.getTaskRun(taskRun.getName()), process.cwd(), false);
  const taskRunData: TknTaskRun = JSON.parse(result.stdout);
  telemetryLog(commandId, 'Open container in terminal command click')
  tkn.executeInTerminal(Command.loginToContainer(taskRunData.status.steps[0].container, taskRunData.status.podName, taskRunData.metadata.namespace), taskRunData.metadata.name);
}
