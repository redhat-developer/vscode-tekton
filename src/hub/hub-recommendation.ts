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
        for (const element of langAndTools) {
          result.push(element.name);
          result.push(element.builder);
          if (element.frameworks){
            result.push(...element.frameworks);
          }
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

