/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { StartObject } from './pipelinecontent';
import { Progress } from '../util/progress';
import { TektonItem } from './tektonitem';
import { showPipelineRunPreview } from '../pipeline/pipeline-preview';
import { window } from 'vscode';
import { telemetryLog, telemetryLogError } from '../telemetry';



export function startPipeline(inputStartPipeline: StartObject): Promise<string> {
  return Progress.execFunctionWithProgress(`Starting Pipeline '${inputStartPipeline.name}'.`, () =>
    TektonItem.tkn.startPipeline(inputStartPipeline)
      .then((pipelineRunName) => TektonItem.ShowPipelineRun() ? showPipelineRunPreview(pipelineRunName) : undefined)
      .then(() => {
        telemetryLog(inputStartPipeline.commandId, 'Pipeline successfully started')
        window.showInformationMessage(`Pipeline '${inputStartPipeline.name}' successfully started`)
      })
      .catch((error) => {
        telemetryLogError(inputStartPipeline.commandId, error);
        window.showErrorMessage(`Failed to start Pipeline with error '${error}'`)
      })
  );
}
