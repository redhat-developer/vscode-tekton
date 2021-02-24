/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { window } from 'vscode';
import { CliExitData } from '../cli';
import { telemetryError } from '../telemetry';
import { Command, ContextType, TektonNode, tkn } from '../tkn';


export async function showDiagnosticData(diagnostic: TektonNode, commandId?: string): Promise<void> {
  if (!diagnostic) return null;
  let result: CliExitData;
  try {
    result = await tkn.execute(Command.getPipelineRunAndTaskRunData(ContextType.PIPELINERUN, diagnostic.getName()));
  } catch (error) {
    telemetryError(commandId, 'No data available to Diagnostic Data.');
    window.showInformationMessage(`No data available for ${diagnostic.getName()} to Diagnostic Data.`);
    return;
  }
  const data = JSON.parse(result.stdout);
  if (diagnostic.contextValue === ContextType.PIPELINERUN || diagnostic.contextValue === ContextType.PIPELINERUNCHILDNODE) {
    const taskRun = [];
    for (const taskRunName in data.status.taskRuns) {
      if (data.status.taskRuns[taskRunName].conditionChecks && data.status.taskRuns[taskRunName].status.conditions[0].reason !== 'Succeeded') {
        for (const conditionName in data.status.taskRuns[taskRunName].conditionChecks) {
          taskRun.push({ label: `${conditionName} (${data.status.taskRuns[taskRunName].conditionChecks[conditionName].status.conditions[0].reason})`, podName: data.status.taskRuns[taskRunName].conditionChecks[conditionName].status.podName });
        }
      } else {
        taskRun.push({ label: `${taskRunName} (${data.status.taskRuns[taskRunName].status.conditions[0].reason})`, podName: data.status.taskRuns[taskRunName].status.podName });
      }
    }
    const taskRunName = await window.showQuickPick(taskRun, { placeHolder: 'Select TaskRun to see diagnostic data', ignoreFocusOut: true });
    if (!taskRunName) return null;
    tkn.executeInTerminal(Command.showDiagnosticData(taskRunName.podName));
  } else {
    tkn.executeInTerminal(Command.showDiagnosticData(data.status.podName));
  }
}
