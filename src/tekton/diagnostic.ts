/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { window } from 'vscode';
import { CliExitData } from '../cli';
import { Command, TektonNode, tkn } from '../tkn';


export async function showDiagnosticData(diagnostic: TektonNode): Promise<void> {
  if (!diagnostic) return null
  let result: CliExitData;
  try {
    result = await tkn.execute(Command.getPipelineRunAndTaskRunData(diagnostic.contextValue, diagnostic.getName()));
  } catch (error) {
    window.showInformationMessage(`No data available for ${diagnostic.getName()} to Diagnostic Data.`);
    return;
  }
  const data = JSON.parse(result.stdout);
  if (diagnostic.contextValue === 'pipelinerun') {
    const taskRun = [];
    for (const taskRunName in data.status.taskRuns) {
      taskRun.push({ label: taskRunName, podName: data.status.taskRuns[taskRunName].status.podName })
    }
    const taskRunName = await window.showQuickPick(taskRun, { placeHolder: 'Select TaskRun to see diagnostic data', ignoreFocusOut: true });
    if (!taskRunName) return null;
    tkn.executeInTerminal(Command.showDiagnosticData(taskRunName.podName));
  } else {
    tkn.executeInTerminal(Command.showDiagnosticData(data.status.podName));
  }
}
