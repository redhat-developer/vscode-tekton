/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { getProjectType } from '../project-analizer/language-recongnizer/recognazer'

const MAX_LANG_AND_TOOLS = 10;
export async function startDetectingLanguage(): Promise<string[]> {
  const folder = vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders[0];
  if (folder) {
    try {
      const langAndTools = await getProjectType(folder.uri.fsPath);
      if (langAndTools && langAndTools.length > 0) {

        const result = [];
        for (let i = 0; i < langAndTools.length; i++) {
          const element = langAndTools[i];
          result.push(element.name);
          result.push(element.builder);
          if (result.length >= MAX_LANG_AND_TOOLS) {
            break;
          }
        }

        return result;
      }
    } catch (err) {
      console.error(err);
    }
  }

  return [];
}

