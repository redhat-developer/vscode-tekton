/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { window } from 'vscode';
import { Command } from '../cli-command';
import { TknTaskRun } from '../tekton';
import { tkn } from '../tkn';


export async function getTaskRunData(taskRunName: string): Promise<TknTaskRun>{
  const result = await tkn.execute(Command.getTaskRun(taskRunName), undefined, false);
  if (result.error) {
    window.showErrorMessage(`TaskRun not Found: ${result.error}`)
    return;
  }
  let data: TknTaskRun;
  try {
    data = JSON.parse(result.stdout);
    // eslint-disable-next-line no-empty
  } catch (ignore) {
  }
  return data;
}
