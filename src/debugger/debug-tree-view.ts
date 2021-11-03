/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { TreeItemCollapsibleState } from 'vscode';
import { Command } from '../cli-command';
import { ContextType } from '../context-type';
import { kubectl } from '../kubectl';
import { TknTaskRun } from '../tekton';
import { tkn } from '../tkn';
import { DebuggerNodeImpl } from '../tree-view/debug-node';
import { TektonNode } from '../tree-view/tekton-node';
import { debugSessions } from '../util/map-object';
import { getStderrString } from '../util/stderrstring';
import { debugExplorer } from './debugExplorer';
import { deleteDebugger } from './delete-debugger';


export interface DebugSessionEntry {
  label?: string;
  name?: string;
  status?: string;
  resourceType?: string;
  resourceName?: string; 
  podName?: string;
  containerName?: string;
  count?: boolean;
  namespace?: string;
}

export async function debugTreeView(): Promise<TektonNode[]> {
  if (debugSessions && debugSessions.size !== 0) {
    const children = [];
    for (const [key] of debugSessions) {
      const obj: DebuggerNodeImpl = new DebuggerNodeImpl(
        null,
        key,
        ContextType.DEBUGGER,
        TreeItemCollapsibleState.None,
      );
      // watchTaskRunContainer(key, value.resourceType);
      children.unshift(obj);
    }
    return children;
  }
}

export async function watchTaskRunContainer(resourceName: string, resourceType: string): Promise<void> {
  try {
    await kubectl.watchRunCommand(Command.watchResources(resourceType, resourceName), async (taskRunData: TknTaskRun) => {
      try {
        if (taskRunData?.status?.podName && taskRunData?.status?.steps?.[0]?.container) {
          const checkDebugStatus = await tkn.execute(Command.isContainerStoppedOnDebug(taskRunData.status.steps[0].container, taskRunData.status.podName, taskRunData.metadata.namespace), process.cwd(), false);
          if (!debugSessions.get(taskRunData.metadata.name)?.count && checkDebugStatus.stdout.trim() && checkDebugStatus.stdout.trim().length !== 0) {
            tkn.executeInTerminal(Command.loginToContainer(taskRunData.status.steps[0].container, taskRunData.status.podName, taskRunData.metadata.namespace), taskRunData.metadata.name);
            debugSessions.set(taskRunData.metadata.name, {
              count: true,
              podName: taskRunData.status.podName,
              containerName: taskRunData.status.steps[0].container,
              resourceName: taskRunData.metadata.name,
              namespace: taskRunData.metadata.namespace
            });
            debugExplorer.refresh();
          }

          const containerPass = new RegExp('current phase is Succeeded');
          if (containerPass.test(getStderrString(checkDebugStatus.error)) && debugSessions.get(taskRunData.metadata.name)) {
            deleteDebugger(taskRunData.metadata.name);
          }

          if (!checkDebugStatus.stdout.trim() && debugSessions.get(taskRunData.metadata.name)?.count) {
            deleteDebugger(taskRunData.metadata.name);
          }
        }
        if (taskRunData?.status?.conditions?.[0].reason === 'TaskRunCancelled' || taskRunData?.status?.conditions?.[0].status === 'False') {
          debugSessions.delete(resourceName);
          debugExplorer.refresh();
        }
      } catch (e) {
        debugSessions.delete(resourceName);
        debugExplorer.refresh();
      }
    });
  } catch (e) {
    debugSessions.delete(resourceName);
    debugExplorer.refresh();
  }
}
