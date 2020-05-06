/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';

/* eslint-disable @typescript-eslint/no-unused-vars */

export class TestTextDocument implements vscode.TextDocument {

  fileName: string;
  isUntitled: boolean;
  languageId: string;
  version = 1;
  isDirty: boolean;
  isClosed: boolean;

  constructor(public uri: vscode.Uri, private text: string) {

  }

  save(): Thenable<boolean> {
    throw new Error('Method not implemented.');
  }
  eol = vscode.EndOfLine.LF;
  lineCount: number;

  lineAt(position: number | vscode.Position): vscode.TextLine {
    throw new Error('Method not implemented.');
  }
  offsetAt(position: vscode.Position): number {
    throw new Error('Method not implemented.');
  }
  positionAt(offset: number): vscode.Position {
    const lines = this.text.split('\n');
    let sum = 0;
    for (let i = 0; i < lines.length; i++) {
      const str = lines[i];
      sum += str.length + 1;
      if (offset <= sum) {
        return new vscode.Position(i, str.length - (sum - offset) + 1);
      }
    }

    throw new Error('Cannot find position!');
  }
  getText(range?: vscode.Range): string {
    return this.text;
  }
  getWordRangeAtPosition(position: vscode.Position, regex?: RegExp): vscode.Range {
    throw new Error('Method not implemented.');
  }
  validateRange(range: vscode.Range): vscode.Range {
    throw new Error('Method not implemented.');
  }
  validatePosition(position: vscode.Position): vscode.Position {
    throw new Error('Method not implemented.');
  }

}
