/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { kubectl, KubectlCommands } from '../kubectl';
import { pipelineExplorer } from '../pipeline/pipelineExplorer';

export const pipelineTriggerStatus = new Map<string, boolean>();

export async function watchCommand(resourceList: string[]): Promise<void> {
  for (const resource of resourceList) {
    refreshResources(resource);
  }
}

async function refreshResources(resourceName: string, id = undefined): Promise<void> {
  await kubectl.watchAllResource(KubectlCommands.watchResources(resourceName), (run) => {
    if (id !== run.metadata.uid) {
      pipelineExplorer.refresh();
    } else if (run.status?.completionTime !== undefined) {
      pipelineExplorer.refresh();
    }
    id = run.metadata.uid;
  });
}

export function disableWatch(): void {
  pipelineTriggerStatus.set('pipeline', false);
  pipelineTriggerStatus.set('trigger', false);
}
