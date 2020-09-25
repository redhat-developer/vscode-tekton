/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/


import * as vscode from 'vscode';
import { Command, getStderrString } from '../tkn';
import { TektonItem } from '../tekton/tektonitem';


export async function triggerSupport(): Promise<string> {
  const result = await TektonItem.tkn.execute(Command.printTknVersion(), process.cwd(), false);
  if (result.error) vscode.window.showErrorMessage(`Fail to fetch tkn version: ${getStderrString(result.error)}`);
  const version = new RegExp('^Triggers version:\\s[v]?(unknown|[0-9]+\\.[0-9]+\\.[0-9]+)$');
  if (result.stdout) {
    const getTriggerVersion: string[] = result.stdout.trim().split('\n').filter((value) => {
      return value.match(version);
    }).map((value) => version.exec(value)[1]);
    return (getTriggerVersion.length) ? getTriggerVersion[0] : undefined;
  }
}
