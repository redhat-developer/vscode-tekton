/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { contextGlobalState } from '../extension';
import * as path from 'path';
import { calculatePipelineGraph, GraphProvider } from './pipeline-graph';
import { Disposable } from '../util/disposable';
import { debounce } from 'debounce';

export interface PipelinePreviewInput {
  readonly document: vscode.TextDocument;
  readonly resourceColumn: vscode.ViewColumn;
  readonly line?: number;
  readonly graphProvider: GraphProvider;
}
export class PipelinePreview extends Disposable {
  static viewType = 'tekton.pipeline.preview';



  public static create(
    input: PipelinePreviewInput,
    previewColumn: vscode.ViewColumn): PipelinePreview {
    const webview = vscode.window.createWebviewPanel(
      PipelinePreview.viewType,
      `Preview ${path.basename(input.document.fileName)}`,
      previewColumn,
      {
        enableFindWidget: true,
        ...getWebviewOptions()
      });


    return new PipelinePreview(webview, input);
  }

  private editor: vscode.WebviewPanel;
  private document: vscode.TextDocument;
  private updateFunc = debounce(() => this.doUpdate(), 500);
  private graphProvider: GraphProvider;
  private readonly onDisposeEmitter = new vscode.EventEmitter<void>();
  public readonly onDispose = this.onDisposeEmitter.event;
  private readonly onDidChangeViewStateEmitter = new vscode.EventEmitter<vscode.WebviewPanelOnDidChangeViewStateEvent>();
  public readonly onDidChangeViewState = this.onDidChangeViewStateEmitter.event;


  constructor(webview: vscode.WebviewPanel, input: PipelinePreviewInput) {
    super();
    this.editor = webview;
    this.document = input.document;
    this.graphProvider = input.graphProvider;
    this.register(this.editor.onDidDispose(() => {
      this.dispose();
    }));

    this.register(vscode.workspace.onDidChangeTextDocument(e => {
      if (e.document.fileName === this.document.fileName) {
        this.update(e.document);
      }
    }));
    this.updateFunc();
  }

  public dispose(): void {
    if (this.disposed) {
      return;
    }

    this.disposed = true;
    this.onDisposeEmitter.fire();
    this.onDisposeEmitter.dispose();

    this.editor.dispose();
    super.dispose();
  }

  reveal(viewColumn: vscode.ViewColumn): void {
    this.editor.reveal(viewColumn);
  }

  update(document: vscode.TextDocument): void {
    if (this.document.fileName === document.fileName) {
      this.updateFunc();
    }
  }

  private async doUpdate(): Promise<void> {
    if (this.disposed) {
      return;
    }
    const html = this.getHmlContent();
    this.setContent(html);

    const graph = await this.graphProvider(this.document);
    this.editor.webview.postMessage({ type: 'images', data: this.getImagesUri() })
    this.editor.webview.postMessage({ type: 'showData', data: graph })
  }

  private setContent(html: string): void {
    const fileName = path.basename(this.document.fileName);
    this.editor.title = `Preview ${fileName}`;
    // this.editor.iconPath = this.iconPath; //TODO: implement
    this.editor.webview.options = getWebviewOptions();
    this.editor.webview.html = html;
  }

  private getHmlContent(): string {
    const nonce = new Date().getTime() + '' + new Date().getMilliseconds();
    const rule = this.editor.webview.cspSource;
    //<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src 'self' AllowScriptsAndAllContent https: data: http://localhost:* http://127.0.0.1:*; media-src 'self' AllowScriptsAndAllContent https: data: http://localhost:* http://127.0.0.1:*; script-src 'unsafe-eval' 'nonce-${nonce}'; style-src 'self' AllowScriptsAndAllContent 'unsafe-inline' https: data: http://localhost:* http://127.0.0.1:*; font-src 'self' AllowScriptsAndAllContent https: data: http://localhost:* http://127.0.0.1:*;">
    return `<!DOCTYPE html>
			<html>
			<head>
				<meta http-equiv="Content-type" content="text/html;charset=UTF-8">
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src 'self' ${rule} http: https: data:; media-src 'self' ${rule} http: https: data:; script-src 'nonce-${nonce}'; style-src 'self' ${rule} 'unsafe-inline' http: https: data:; font-src 'self' ${rule} http: https: data:;">
                <style>
                    html {
                        height: 100%; 
                        width: 100%;
                    }
                    #cy {
                        height: 100%; 
                        width: 100%;
                    }

                    #container {
                        width: 100vw; 
                        height: 100vh; 
                        display: flex; 
                        justify-content: center; 
                        align-items: center; 
                        padding: 0;
                        overflow: scroll;
                    }
                </style>
			</head>
            <body id="container">
                <div id="cy" />
				${this.getScripts(nonce)}
			</body>
			</html>`;
  }

  private getScripts(nonce: string): string {
    const out: string[] = [];
    out.push(`<script async
				src="${escapeAttribute(this.editor.webview.asWebviewUri(vscode.Uri.file(path.join(contextGlobalState.extensionPath, '/preview/index.js'))))}"
				nonce="${nonce}"
				charset="UTF-8"></script>`);
    return out.join('\n');
  }

  private getImagesUri(): { [key: string]: string } {
    const result: { [key: string]: string } = Object.create(null);
    result['task'] = this.editor.webview.asWebviewUri(vscode.Uri.file(path.join(contextGlobalState.extensionPath, 'images', 'T.svg'))).toString();
    result['clustertask'] = this.editor.webview.asWebviewUri(vscode.Uri.file(path.join(contextGlobalState.extensionPath, 'images', 'CT.svg'))).toString();
    return result;
  }

}

function escapeAttribute(value: string | vscode.Uri): string {
  return value.toString().replace(/"/g, '&quot;');
}


function getWebviewOptions(): vscode.WebviewOptions {
  return {
    enableScripts: true,
    localResourceRoots: getLocalResourceRoots()
  };
}

function getLocalResourceRoots(): vscode.Uri[] {
  return [
    vscode.Uri.file(path.join(contextGlobalState.extensionPath, '/preview')),
    vscode.Uri.file(path.join(contextGlobalState.extensionPath, '/images'))
  ];
}
