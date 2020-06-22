/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { Disposable, commands } from 'vscode';

interface CommandConstructor {
  new(): Command;
}

const registrableCommands: CommandConstructor[] = [];

export function command(): ClassDecorator {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (target: any) => {
    registrableCommands.push(target);
  };
}

export abstract class Command implements Disposable {

  private readonly disposable: Disposable;
  constructor(id: string) {
    if (id) {
      this.disposable = commands.registerCommand(id, (...args: any[]) => this.execute(...args))
    }
  }

  dispose(): void {
    this.disposable?.dispose()
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  abstract execute(...args: any[]): any;

}
