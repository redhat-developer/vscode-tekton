/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/
import * as vscode from 'vscode';

export class Disposable {
  protected disposed = false;

  protected disposables: vscode.Disposable[] = [];

  dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    disposeAll(this.disposables);
  }

  register<T extends vscode.Disposable>(value: T): T {
    if (this.disposed) {
      value.dispose();
    } else {
      this.disposables.push(value);
    }
    return value;
  }

  protected get isDisposed(): boolean {
    return this.disposed;
  }
}

export function disposeAll(disposables: vscode.Disposable[]): void {
  disposables.forEach(d => {
    if (d) {
      d.dispose();
    }
  });
}
