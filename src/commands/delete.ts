/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { customTektonExplorer } from '../pipeline/customTektonExplorer'
import { pipelineExplorer } from '../pipeline/pipelineExplorer'
import { Pipeline } from '../tekton/pipeline';
import { cli, CliCommand } from '../cli';
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
import { ClusterTriggerBinding } from '../tekton/clustertriggerbunding';
import { telemetryLogCommand, telemetryLogError } from '../telemetry';
import { ContextType } from '../context-type';
import { TektonNode } from '../tree-view/tekton-node';
import { checkRefResource, getPipelineList, referenceOfTaskAndClusterTaskInCluster } from '../util/check-ref-resource';
import { TknPipeline } from '../tekton';

interface Refreshable {
  refresh(): void;
}

export function deleteFromExplorer(node: TektonNode, commandId?: string): Promise<void | string> {

  const selection = pipelineExplorer.getSelection();
  return doDelete(getItemToDelete(node, selection), pipelineExplorer, commandId);
}

export function deleteFromCustom(node: TektonNode, commandId?: string): Promise<void | string> {

  const selection = customTektonExplorer.getSelection();
  return doDelete(getItemToDelete(node, selection), customTektonExplorer, commandId);
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

async function doDelete(items: TektonNode[], toRefresh: Refreshable, commandId?: string): Promise<void | string> {
  if (items) {
    let message: string;
    let hasAnyReference = false;
    let pipelineList: TknPipeline[];
    const hasAnyTaskOrClusterTask = items.some(item => item.contextValue === ContextType.TASK || item.contextValue === ContextType.CLUSTERTASK);
    if (hasAnyTaskOrClusterTask) {
      pipelineList = await getPipelineList();
    }
    const toDelete = new Map<TektonNode, CliCommand>();
    for (const item of items) {
      const deleteCommand = getDeleteCommand(item);
      if (deleteCommand) {
        toDelete.set(item, deleteCommand);
      }
      if (!hasAnyReference && checkRefResource() && pipelineList?.length !== 0 && (item.contextValue === ContextType.TASK || item.contextValue === ContextType.CLUSTERTASK)) {
        hasAnyReference = referenceOfTaskAndClusterTaskInCluster(item, pipelineList);
      }
    }
    if (toDelete.size === 0) {
      return;
    }
    if (toDelete.size > 1) {
      if (!hasAnyReference) {
        message = `Do you want to delete ${toDelete.size} items?`;
      } else {
        message = `Do you want to delete ${toDelete.size} items?. You have selected Task or ClusterTask which is being used in some other resource.`;
      }
      const value = await window.showWarningMessage(message, 'Yes', 'Cancel');
      if (value === 'Yes') {
        return Progress.execFunctionWithProgress('Deleting...', async () => {
          for (const del of toDelete.values()) {
            try {
              await cli.execute(del);
            } catch (err) {
              console.error(err);
            }
          }
        })
          .then(() => toRefresh.refresh())
          .then(() => {
            const message = 'All items successfully deleted.';
            telemetryLogCommand(commandId, message);
            return window.showInformationMessage(message);
          })
          .catch((err) => {
            telemetryLogError(commandId, err);
            return Promise.reject(`Failed to delete: '${err}'.`);
          });
      }

    } else {
      const name = toDelete.keys().next().value.getName();
      if (!hasAnyReference) {
        message = `Do you want to delete the '${name}'?`;
      } else {
        message = `Do you want to delete the ${toDelete.keys().next().value.contextValue}: '${name}' which is used in some other resource?`;
      }
      const value = await window.showWarningMessage(message, 'Yes', 'Cancel');
      if (value === 'Yes') {
        return Progress.execFunctionWithProgress(`Deleting the '${name}'.`, () =>
          cli.execute(toDelete.values().next().value))
          .then(() => toRefresh.refresh())
          .then(() => {
            telemetryLogCommand(commandId, 'Successfully deleted.');
            return window.showInformationMessage(`The '${name}' successfully deleted.`)
          })
          .catch((err) => {
            telemetryLogError(commandId, err);
            return window.showErrorMessage(`Failed to delete the '${name}': '${err}'.`)
          });
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
    case ContextType.PIPELINERUNCHILDNODE:
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
    case ContextType.CLUSTERTRIGGERBINDING:
      return ClusterTriggerBinding.getDeleteCommand(item);
  }

  return undefined;
}
