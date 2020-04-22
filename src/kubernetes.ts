/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { Command, tkn as tkn } from './tkn';

interface K8sClusterExplorerItem {
  nodeType: 'resource';
  nodeCategory?: string;
  kind: K8sClusterExplorerItemKind;
  name: string;
  kindName?: string;
}

interface K8sClusterExplorerItemKind {
  displayName?: string;
  pluralDisplayName?: string;
  manifestKind?: string;
  abbreviation?: string;
}

class K8sCommands {
  showLogs(context: K8sClusterExplorerItem): void {
    if (context?.kind?.abbreviation === 'taskruns') {
      tkn.executeInTerminal(Command.showTaskRunLogs(context.name));
    } else if (context?.kind?.abbreviation === 'pipelineruns') {
      tkn.executeInTerminal(Command.showPipelineRunLogs(context.name));
    } else {
      throw new Error(`Can't handle log request for ${context.name}`);
    }
  }

  followLogs(context: K8sClusterExplorerItem): void {
    if (context?.kind?.abbreviation === 'taskruns') {
      tkn.executeInTerminal(Command.showTaskRunFollowLogs(context.name));
    } else if (context?.kind?.abbreviation === 'pipelineruns') {
      tkn.executeInTerminal(Command.showPipelineRunFollowLogs(context.name));
    } else {
      throw new Error(`Can't handle log request for ${context.name}`);
    }
  }
}

export const k8sCommands = new K8sCommands();

