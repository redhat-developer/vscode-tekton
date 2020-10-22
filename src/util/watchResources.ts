/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { kubectl, KubectlCommands } from '../kubectl';
import { pipelineExplorer } from '../pipeline/pipelineExplorer';

export async function watchCommand(): Promise<void> {
  const resourceList = ['pipeline', 'pipelinerun', 'taskrun', 'task', 'clustertask', 'pipelineresources', 'tt', 'tb', 'el', 'ctb', 'condition'];
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
