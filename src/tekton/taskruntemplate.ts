/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import * as yaml from 'js-yaml';
import { window } from 'vscode';
import { TektonNode } from '../tkn';
import * as vscode from 'vscode';
import { TektonItem } from './tektonitem';
import { tektonFSUri } from '../util/tekton-vfs';

export async function openTaskRunTemplate(context: TektonNode): Promise<void> {
  const outputFormat = TektonItem.getOutputFormat();
  const uri = tektonFSUri('generateTaskRun', context.getName(), outputFormat);
  vscode.workspace.openTextDocument(uri).then((doc) => {
    window.showTextDocument(doc, { preserveFocus: true, preview: true });
  });
}
