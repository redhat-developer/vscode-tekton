/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { CliCommand } from '../cli';
import { tkn } from '../tkn';
import * as vscode from 'vscode';


class LogDocumentProvider implements vscode.TextDocumentContentProvider {
  onDidChangeEmitter = new vscode.EventEmitter<vscode.Uri>();
  onDidChange = this.onDidChangeEmitter.event;
  
  private documentMap = new Map<string, string>();

  provideTextDocumentContent(uri: vscode.Uri): vscode.ProviderResult<string> {
    if (this.documentMap.has(uri.toString())){
      return this.documentMap.get(uri.toString());
    }
    return undefined;
  }

  addDocument(uri: vscode.Uri): void {
    this.documentMap.set(uri.toString(), '');
  }

  updateDocument(uri: vscode.Uri, change: string): void {
    this.documentMap.set(uri.toString(), this.documentMap.get(uri.toString()) + change);
    this.onDidChangeEmitter.fire(uri);
  }

  deleteDocument(uri: vscode.Uri): void {
    this.documentMap.delete(uri.toString());
  }
}

const logProvider = new LogDocumentProvider();


export function registerLogDocumentProvider(): vscode.Disposable {
  return vscode.workspace.registerTextDocumentContentProvider('tkn-log', logProvider);
}

export async function showLogInEditor(command: CliCommand, title: string): Promise<void> {
  const process = tkn.executeWatch(command);
  const uri = vscode.Uri.parse(`tkn-log:${title}`)

  logProvider.addDocument(uri);
  vscode.window.showTextDocument(uri);
  
  process.stdout.setEncoding('UTF8');
  process.stderr.setEncoding('UTF8');
  process.stdout.on('data', (chunk) => {
    logProvider.updateDocument(uri, chunk);
  });

  process.stderr.on('data', chunk => {
    logProvider.updateDocument(uri, chunk);
  });

  process.on('close', () => {
    logProvider.updateDocument(uri, '\n>>>RUN FINISHED<<<');
    logProvider.deleteDocument(uri);
  });
}

