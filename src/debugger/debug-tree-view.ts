/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { TreeItemCollapsibleState, window } from 'vscode';
import { Command } from '../cli-command';
import { ContextType } from '../context-type';
import { kubectl } from '../kubectl';
import { TknTaskRun } from '../tekton';
import { tkn } from '../tkn';
import { DebuggerNodeImpl } from '../tree-view/debug-node';
import { TektonNode } from '../tree-view/tekton-node';
import { getStderrString } from '../util/stderrstring';
import { debugExplorer } from './debugExplorer';


interface DebugSessionEntry {
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

export const sessions: Map<string, DebugSessionEntry> = new Map();


export async function debugTreeView(): Promise<TektonNode[]> {
  if (sessions && sessions.size !== 0) {
    const children = [];
    for (const [key] of sessions) {
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
          if (!sessions.get(taskRunData.metadata.name)?.count && checkDebugStatus.stdout.trim() && checkDebugStatus.stdout.trim().length !== 0) {
            tkn.executeInTerminal(Command.loginToContainer(taskRunData.status.steps[0].container, taskRunData.status.podName, taskRunData.metadata.namespace), taskRunData.metadata.name);
            sessions.set(taskRunData.metadata.name, {
              count: true,
              podName: taskRunData.status.podName,
              containerName: taskRunData.status.steps[0].container,
              resourceName: taskRunData.metadata.name,
              namespace: taskRunData.metadata.namespace
            });
            debugExplorer.refresh();
          }

          const containerPass = new RegExp('current phase is Succeeded');
          if (containerPass.test(getStderrString(checkDebugStatus.error)) && sessions.get(taskRunData.metadata.name)) {
            deleteDebugger(taskRunData);
          }

          if (!checkDebugStatus.stdout.trim() && sessions.get(taskRunData.metadata.name)?.count) {
            deleteDebugger(taskRunData);
          }
        }
        if (taskRunData?.status?.conditions?.[0].reason === 'TaskRunCancelled' || taskRunData?.status?.conditions?.[0].status === 'False') {
          sessions.delete(resourceName);
          debugExplorer.refresh();
        }
      } catch (e) {
        sessions.delete(resourceName);
        debugExplorer.refresh();
      }
    });
  } catch (e) {
    sessions.delete(resourceName);
    debugExplorer.refresh();
  }
}

function deleteDebugger(taskRunData: TknTaskRun): void {
  sessions.delete(taskRunData.metadata.name);
  const activeTerminal = window.terminals;
  activeTerminal.map((terminal) => {
    if (terminal.name.trim() === `Tekton:${taskRunData.metadata.name}`) {
      terminal.dispose();
    }
  });
  debugExplorer.refresh();
}
