/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { Disposable } from '../util/disposable';
import { codeActionProvider } from './tkn-code-actions';
import { definitionProvider, definitionProviderMap } from './tkn-definition-providers';
import { tektonYaml } from './tkn-yaml';

const disposable = new Disposable();

const langFuncMap = new Map<string, Disposable>();

export function initializeTknEditing(context: vscode.ExtensionContext): void {
  context.subscriptions.push(disposable);
  vscode.workspace.textDocuments.forEach(handleTextDocument);
  disposable.register(vscode.workspace.onDidOpenTextDocument(handleTextDocument));
  disposable.register(vscode.workspace.onDidCloseTextDocument(doc => {
    if (langFuncMap.has(doc.uri.fsPath)){
      langFuncMap.get(doc.uri.fsPath).dispose();
      langFuncMap.delete(doc.uri.fsPath);
    }
  }));
  disposable.register({
    dispose: ()=> {
      langFuncMap.forEach(it => it.dispose());
    }});
}

function handleTextDocument(doc: vscode.TextDocument): void {
  if (doc.languageId === 'yaml') {
    const type = tektonYaml.isTektonYaml(doc);
    if (!langFuncMap.has(doc.uri.fsPath)){
      langFuncMap.set(doc.uri.fsPath, new Disposable());
    }
    if (type && definitionProviderMap.has(type)) {
      langFuncMap.get(doc.uri.fsPath).register(vscode.languages.registerDefinitionProvider({ language: 'yaml', pattern: doc.fileName }, definitionProvider))
    }

    if (type && codeActionProvider.isSupports(type)){
      langFuncMap.get(doc.uri.fsPath).register(
        vscode.languages.registerCodeActionsProvider({language: 'yaml', pattern: doc.fileName}, codeActionProvider.getProvider(type), codeActionProvider.getProviderMetadata(type)));
    }

  }
}
