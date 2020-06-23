/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { Trigger } from '../../tekton/pipelinecontent';
import { Progress } from '../../util/progress';
import { TektonItem } from '../../tekton/tektonitem';
import { commands } from 'vscode';

export interface NameType {
  name: string;
  type: string;
}

export interface Sudhir {
  name: string;
}

export interface Params {
  default: string;
  description: string;
  name: string;
}

export interface Workspaces {
  name: string;
  workspaceName?: string;
  workspaceType?: string;
  key?: string;
  value?: string;
  subPath?: string;
  emptyDir?: string;
}


export const stringToContext = new Map<string, Trigger>();

export default class PipelineViewLoader {

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  static get extensionPath() {
    return vscode.extensions.getExtension('redhat.vscode-tekton-pipelines').extensionPath
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  static async loadView(title: string, context: any): Promise<vscode.WebviewPanel> {
    stringToContext.set('pipelineStart', context);
    const localResourceRoot = vscode.Uri.file(path.join(PipelineViewLoader.extensionPath, 'out', 'pipelineView'));

    const panel = vscode.window.createWebviewPanel('pipelineView', title, vscode.ViewColumn.One, {
      enableScripts: true,
      localResourceRoots: [localResourceRoot],
      retainContextWhenHidden: true
    });
    panel.iconPath = vscode.Uri.file(path.join(PipelineViewLoader.extensionPath, 'images/tekton.svg'));

    // TODO: When webview is going to be ready?
    panel.webview.html = PipelineViewLoader.getWebviewContent(PipelineViewLoader.extensionPath, context);
    panel.webview.onDidReceiveMessage(async (event) => {
      if (event.action === 'cancel') {
        await commands.executeCommand('workbench.action.closeActiveEditor');
      }
      if (event.action === 'start') {
        await commands.executeCommand('workbench.action.closeActiveEditor');
        const inputStartPipeline = event.data;
        return Progress.execFunctionWithProgress('Starting Pipeline.', () =>
          TektonItem.tkn.startPipeline(inputStartPipeline)
            .then(() => TektonItem.explorer.refresh())
            .then(() => `Pipeline '${inputStartPipeline.name}' successfully started`)
            .catch((error) => Promise.reject(`Failed to start Pipeline with error '${error}'`))
        );
      }
    });
    return panel;
  }

  private static getWebviewContent(extensionPath: string, context: any): string {
    // Local path to main script run in the webview
    const reactAppRootOnDisk = path.join(extensionPath, 'out', 'pipelineView');
    const reactAppPathOnDisk = vscode.Uri.file(
      path.join(reactAppRootOnDisk, 'pipelineView.js'),
    );
    const reactAppUri = reactAppPathOnDisk.with({ scheme: 'vscode-resource' });
    const htmlString: Buffer = fs.readFileSync(path.join(reactAppRootOnDisk, 'index.html'));
    const meta = `<meta http-equiv="Content-Security-Policy"
    content="connect-src *;
        default-src 'none';
        img-src https:;
        script-src 'unsafe-eval' 'unsafe-inline' vscode-resource:;
        style-src vscode-resource: 'unsafe-inline';">`;
    return `${htmlString}`
      .replace('%COMMAND%', JSON.stringify(context).replace(/\\/g, '\\\\'))
      .replace('pipelineView.js',`${reactAppUri}`)
      .replace('<!-- meta http-equiv="Content-Security-Policy" -->', meta);
  }
}
