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
        if (taskRunData?.status?.podName && taskRunData?.status?.steps.length !== 0) {
          for (const containerData of taskRunData.status.steps) {
            const debugTaskName = `${taskRunData.metadata.name}-${containerData.container}`;
            const checkDebugStatus = await tkn.execute(Command.isContainerStoppedOnDebug(containerData.container, taskRunData.status.podName, taskRunData.metadata.namespace), process.cwd(), false);
            if (!debugSessions.get(debugTaskName)?.count && checkDebugStatus.stdout.trim() && checkDebugStatus.stdout.trim().length !== 0) {
              tkn.executeInTerminal(Command.loginToContainer(containerData.container, taskRunData.status.podName, taskRunData.metadata.namespace), debugTaskName);
              debugSessions.set(debugTaskName, {
                count: true,
                podName: taskRunData.status.podName,
                containerName: containerData.container,
                resourceName: taskRunData.metadata.name,
                namespace: taskRunData.metadata.namespace
              });
              debugExplorer.refresh();
            }

            const containerPass = new RegExp('current phase is Succeeded');
            if (containerPass.test(getStderrString(checkDebugStatus.error)) && debugSessions.get(debugTaskName)) {
              deleteDebugger(debugTaskName);
            }

            if (!checkDebugStatus.stdout.trim() && debugSessions.get(debugTaskName)?.count) {
              deleteDebugger(debugTaskName);
            }
          }
        }
        if (taskRunData?.status?.conditions?.[0].reason === 'TaskRunCancelled' || taskRunData?.status?.conditions?.[0].status === 'False') {
          deleteDebugSessions(taskRunData);
        }
      } catch (e) {
        deleteMapDebugSessions(resourceName);
      }
    });
  } catch (e) {
    deleteMapDebugSessions(resourceName);
  }
}

function deleteDebugSessions(taskRunData: TknTaskRun): void {
  if (taskRunData?.status?.podName && taskRunData?.status?.steps.length !== 0) {
    for (const containerData of taskRunData.status.steps) {
      const debugTaskName = `${taskRunData.metadata.name}-${containerData.container}`;
      if (debugSessions.get(debugTaskName)?.count) {
        debugSessions.delete(debugTaskName);
        debugExplorer.refresh();
      }
    }
  }
}

function deleteMapDebugSessions(resourceName: string): void {
  if (debugSessions && debugSessions.size !== 0) {
    for (const [key, value] of debugSessions) {
      if (value.resourceName === resourceName) {
        debugSessions.delete(key);
        debugExplorer.refresh();
      }
    }
  }
}
