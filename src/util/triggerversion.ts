/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/


import * as vscode from 'vscode';
import { Command, getStderrString } from '../tkn';
import { TektonItem } from '../tekton/tektonitem';


export async function newElSupport(): Promise<boolean> {
  const result = await TektonItem.tkn.execute(Command.printTknVersion(), process.cwd(), false);
  if (result.error) vscode.window.showErrorMessage(`Fail to fetch tkn version: ${getStderrString(result.error)}`);
  const version = new RegExp('^Triggers version:\\s[v]?([0-9]+\\.[0-9]+\\.[0-9]+)$');
  if (result.stdout) {
    const getTriggerVersion: string[] = result.stdout.trim().split('\n').filter((value) => {
      return value.match(version);
    }).map((value) => version.exec(value)[1]);
    if ('0.5.0' >= getTriggerVersion[0]) return true;
    return false;
  }
}
