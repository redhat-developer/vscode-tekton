/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { StartObject } from './pipelinecontent';
import { Progress } from '../util/progress';
import { TektonItem } from './tektonitem';
import { showPipelineRunPreview } from '../pipeline/pipeline-preview';



export function startPipeline(inputStartPipeline: StartObject): Promise<string> {
  return Progress.execFunctionWithProgress(`Starting Pipeline '${inputStartPipeline.name}'.`, () =>
    TektonItem.tkn.startPipeline(inputStartPipeline)
      .then(() => TektonItem.explorer.refresh())
      .then(async () => TektonItem.ShowPipelineRun() ? await TektonItem.tkn.getLatestPipelineRun(inputStartPipeline.name) : undefined)
      .then((value) => TektonItem.ShowPipelineRun() ? showPipelineRunPreview(value[0].getName()) : undefined)
      .then(() => `Pipeline '${inputStartPipeline.name}' successfully started`)
      .catch((error) => Promise.reject(`Failed to start Pipeline with error '${error}'`))
  );
}
