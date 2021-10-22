/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { window } from 'vscode';
import { debugSessions } from '../util/map-object';
import { debugExplorer } from './debugExplorer';


export function deleteDebugger(name: string): void {
  debugSessions.delete(name);
  const activeTerminal = window.terminals;
  activeTerminal.map((terminal) => {
    if (terminal.name.trim() === `Tekton:${name}`) {
      terminal.dispose();
    }
  });
  debugExplorer.refresh();
}
