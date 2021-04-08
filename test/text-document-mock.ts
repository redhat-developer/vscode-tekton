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
  
  private text: string;

  constructor(public uri: vscode.Uri, text: string) {
    this.text = text.replace(/\r\n/gm, '\n'); // normalize end of line
  }

  save(): Thenable<boolean> {
    throw new Error('Method not implemented.');
  }
  eol = vscode.EndOfLine.LF;
  lineCount: number;

  private get lines(): string[] {
    return this.text.split('\n');
  }

  lineAt(position: number | vscode.Position): vscode.TextLine {
    const line = typeof position === 'number' ? position : position.line
    const text = this.lines[line];
    return {
      text,
      range: new vscode.Range(line, 0, line, text.length)
    } as vscode.TextLine;
  }
  
  offsetAt(position: vscode.Position): number {
    const lines = this.text.split('\n');
    let currentOffSet = 0;
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      if (position.line === i) {
        if (l.length < position.character) {
          throw new Error(`Position ${JSON.stringify(position)} is out of range. Line [${i}] only has length ${l.length}.`);
        }
        return currentOffSet + position.character;
      } else {
        currentOffSet += l.length + 1;
      }
    }
    throw new Error(`Position ${JSON.stringify(position)} is out of range. Document only has ${lines.length} lines.`);
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
    if (!range)
      return this.text;
    const offset = this.offsetAt(range.start);
    const length = this.offsetAt(range.end) - offset;
    return this.text.substr(offset, length);
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
