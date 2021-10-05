/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { telemetryLog } from '../telemetry';
import { version } from './tknversion';
import { pipelineTriggerStatus, watchResources } from './watchResources';

export async function watchTektonResources(extensionStartUpCheck?: boolean): Promise<void> {
  const tknVersion = await version();
  const resourceUidAtStart = {};
  if (tknVersion && (tknVersion?.trigger === undefined || tknVersion.trigger.trim() === 'unknown')) {
    pipelineTriggerStatus.set('trigger', false);
  }
  if (!pipelineTriggerStatus.get('pipeline')) {
    const resourceList = ['pipeline', 'pipelinerun', 'taskrun', 'task', 'clustertask', 'pipelineresources', 'condition'];
    if (extensionStartUpCheck) telemetryLog('startUp_watch_tekton_Pipeline_resource', 'startUp Pipeline watch');
    watchResources.watchCommand(resourceList, resourceUidAtStart);
    pipelineTriggerStatus.set('pipeline', true);
  }
  if (!pipelineTriggerStatus.get('trigger') && tknVersion && tknVersion?.trigger !== undefined && tknVersion.trigger.trim() !== 'unknown') {
    const resourceList = ['tt', 'tb', 'el', 'ctb'];
    if (extensionStartUpCheck) telemetryLog('startUp_watch_tekton_Trigger_resource', 'startUp trigger watch');
    watchResources.watchCommand(resourceList, resourceUidAtStart);
    pipelineTriggerStatus.set('trigger', true);
  }   
}
