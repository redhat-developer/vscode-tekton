/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { window } from 'vscode';
import { TektonNode } from '../tkn';
import * as vscode from 'vscode';
import { TektonItem } from './tektonitem';
import { tektonFSUri } from '../util/tekton-vfs';

export const TASK_RUN_YAML_GENERATE = 'taskRunYamlGenerate';

export async function openTaskRunTemplate(context: TektonNode): Promise<void> {
  const outputFormat = TektonItem.getOutputFormat();
  const uri = tektonFSUri('generateTaskRun', `taskRun-for-${context.getName()}`, outputFormat, undefined, TASK_RUN_YAML_GENERATE);
  vscode.workspace.openTextDocument(uri).then((doc) => {
    window.showTextDocument(doc, { preserveFocus: true, preview: true });
  });
}
