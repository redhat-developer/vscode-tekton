/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { StartObject } from './pipelinecontent';
import { PipelineRunData } from '../tekton';
import { TektonItem } from './tektonitem';
import { Command } from '../tkn';
import { AddTriggerFormValues } from './triggertype';

export async function addTrigger(inputAddTrigger: AddTriggerFormValues): Promise<string> {
  console.log(inputAddTrigger);
  // const triggerBinding = inputAddTrigger.trigger;
  return await '';
}

// function getPipelineRunFrom(inputAddTrigger: AddTriggerFormValues) {
//   const pipelineRunData: PipelineRunData = {
//     spec: {
//       pipelineRef: {
//         name: inputAddTrigger.name,
//       },
//       params: inputAddTrigger.params,
//       resources: inputAddTrigger.resources
//     },
//   };
//   getPipelineRunData(pipelineRunData);
// }

// async function getPipelineRunData(latestRun: PipelineRunData) {
//   const pipeline = await TektonItem.tkn.execute(Command.getPipeline(latestRun.spec.pipelineRef.name), process.cwd(), false);
//   const pipelineData = JSON.parse(pipeline.stdout);
//   const newPipelineRun = {
//     apiVersion: pipeline ? pipeline.apiVersion : latestRun.apiVersion,
//     kind: PipelineRunModel.kind,
//     metadata: {
//       name: `${pipelineName}-${getRandomChars(6)}`,
//       namespace: pipeline ? pipeline.metadata.namespace : latestRun.metadata.namespace,
//       labels: _.merge({}, pipeline?.metadata?.labels, latestRun?.metadata?.labels, {
//         'tekton.dev/pipeline': pipelineName,
//       }),
//     },
//     spec: {
//       ...(latestRun?.spec || {}),
//       pipelineRef: {
//         name: pipelineName,
//       },
//       resources,
//       ...(params && { params }),
//       workspaces,
//       status: null,
//     },
//   };
// }
