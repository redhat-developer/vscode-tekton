/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { customTektonExplorer } from '../pipeline/customTektonExplorer'
import { pipelineExplorer } from '../pipeline/pipelineExplorer'
import { TektonItem } from '../tekton/tektonitem';
import { Pipeline } from '../tekton/pipeline';
import { CliCommand } from '../cli';
import { TektonNode, tkn, ContextType } from '../tkn';
import { Condition } from '../tekton/condition';
import { PipelineResource } from '../tekton/pipelineresource';
import { PipelineRun } from '../tekton/pipelinerun';
import { Task } from '../tekton/task';
import { TriggerTemplate } from '../tekton/triggertemplate';
import { TriggerBinding } from '../tekton/triggerbinding';
import { EventListener } from '../tekton/eventlistener';
import { ClusterTask } from '../tekton/clustertask';
import { TaskRun } from '../tekton/taskrun';
import { window } from 'vscode';
import { Progress } from '../util/progress';

type deleteFn = (node: TektonItem) => Promise<string | undefined>;

interface Refreshable {
  refresh(): void;
}

export function deleteFromExplorer(node: TektonNode): Promise<void | string> {

  const selection = pipelineExplorer.getSelection();
  return doDelete(getItemToDelete(node, selection), pipelineExplorer);
}

export function deleteFromCustom(node: TektonNode): Promise<void | string> {

  const selection = customTektonExplorer.getSelection();
  return doDelete(getItemToDelete(node, selection), customTektonExplorer);
}

function getItemToDelete(contextItem: TektonNode, selectedItems: TektonNode[]): TektonNode[] {
  if (contextItem) {
    if (selectedItems) {
      if (selectedItems.includes(contextItem)) {
        return selectedItems;
      }
    }
    return [contextItem];
  }
}

async function doDelete(items: TektonNode[], toRefresh: Refreshable): Promise<void | string> {
  if (items) {
    const toDelete = new Map<TektonNode, CliCommand>();
    for (const item of items) {
      const deleteCommand = getDeleteCommand(item);
      if (deleteCommand) {
        toDelete.set(item, deleteCommand);
      }
    }
    if (toDelete.size === 0) {
      return;
    }
    if (toDelete.size > 1) {
      const value = await window.showWarningMessage(`Do you want to delete ${toDelete.size} items?`, 'Yes', 'Cancel');
      if (value === 'Yes') {
        return Progress.execFunctionWithProgress('Deleting...', async () => {
          for (const del of toDelete.values()) {
            try {
              await tkn.execute(del);
            } catch (err) {
              console.error(err);
            }
          }
        })
          .then(() => toRefresh.refresh())
          .then(() => 'All items successfully deleted.')
          .catch((err) => Promise.reject(`Failed to delete: '${err}'.`));
      }

    } else {
      const name = toDelete.keys().next().value.getName();
      const value = await window.showWarningMessage(`Do you want to delete the '${name}'?`, 'Yes', 'Cancel');
      if (value === 'Yes') {
        return Progress.execFunctionWithProgress(`Deleting the '${name}'.`, () =>
          tkn.execute(toDelete.values().next().value))
          .then(() => toRefresh.refresh())
          .then(() => `The '${name}' successfully deleted.`)
          .catch((err) => Promise.reject(`Failed to delete the '${name}': '${err}'.`));
      }
    }
  }
}

function getDeleteCommand(item: TektonNode): CliCommand | undefined {
  switch (item.contextValue) {
    case ContextType.PIPELINE:
      return Pipeline.getDeleteCommand(item);
    case ContextType.CONDITIONS:
      return Condition.getDeleteCommand(item);
    case ContextType.PIPELINERESOURCE:
      return PipelineResource.getDeleteCommand(item);
    case ContextType.PIPELINERUN:
      return PipelineRun.getDeleteCommand(item);
    case ContextType.TASK:
      return Task.getDeleteCommand(item);
    case ContextType.TRIGGERTEMPLATES:
      return TriggerTemplate.getDeleteCommand(item);
    case ContextType.TRIGGERBINDING:
      return TriggerBinding.getDeleteCommand(item);
    case ContextType.EVENTLISTENER:
      return EventListener.getDeleteCommand(item);
    case ContextType.CLUSTERTASK:
      return ClusterTask.getDeleteCommand(item);
    case ContextType.TASKRUN:
      return TaskRun.getDeleteCommand(item);
  }

  return undefined;
}
