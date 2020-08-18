/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { TektonNode } from '../tkn';
import { TknResourceItem } from './webviewstartpipeline';
import { TektonItem } from './tektonitem';

export async function pipelineRunData(pipelineRunContent: TektonNode): Promise<TknResourceItem> {
  const pipelineRunData: TknResourceItem = {
    name: pipelineRunContent['item'].spec.pipelineRef.name,
    serviceAccount: undefined,
    pipelineResource: undefined,
    Secret: undefined,
    ConfigMap: undefined,
    PersistentVolumeClaim: undefined,
    pipelineRun: pipelineRunContent['item'].spec
  };
  if (pipelineRunContent['item'].spec.workspaces) await TektonItem.workspaceData(pipelineRunData);
  await TektonItem.pipelineResourcesList(pipelineRunData);
  return pipelineRunData;
}
