/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import * as cliInstance from '../cli';
import { PipelineWizard } from '../pipeline/wizard';
import { ViewColumn, window } from 'vscode';
import { collectWizardContent, TknResourceItem } from './collect-data-for-wizard';
import { TknPipelineTrigger } from '../tekton';
import { TektonItem } from './tektonitem';
import { multiStepInput } from '../util/MultiStepInput';
import { addTriggerToPipeline } from './addtrigger';
import { telemetryLogError } from '../telemetry';
import { TektonNode } from '../tree-view/tekton-node';
import { Command } from '../cli-command';


export async function addTrigger(pipeline: TektonNode, commandId?: string): Promise<string> {
  if (!pipeline) return null;
  const result: cliInstance.CliExitData = await TektonItem.tkn.execute(Command.getPipeline(pipeline.getName()), process.cwd(), false);
  let pipelineResource: TknPipelineTrigger;
  if (result.error) {
    telemetryLogError(commandId, result.error);
    return window.showErrorMessage(`${result.error} Std.err when processing pipelines`);
  }
  try {
    pipelineResource = JSON.parse(result.stdout);
  } catch (ignore) {
    //show no pipelines if output is not correct json
  }
  const trigger = await collectWizardContent(pipelineResource.metadata.name, pipelineResource.spec.params, pipelineResource.spec.resources, pipelineResource.spec.workspaces, true);
  if (commandId) trigger.commandId = commandId;
  if (!trigger.params && !trigger.resources && !trigger.workspaces) {
    selectTrigger(trigger);
  } else {
    PipelineWizard.create({ trigger, resourceColumn: ViewColumn.Active }, ViewColumn.Active, 'Add Trigger', trigger.name);
  }
}

async function selectTrigger(trigger: TknResourceItem): Promise<string> {
  const initialResourceFormValues = {
    name: undefined,
    params: [],
    resources: [],
    workspaces: [],
    trigger: undefined,
    commandId: undefined
  }
  const pick = await multiStepInput.showQuickPick({
    title: 'Webhook: Git Provider Type',
    placeholder: 'Select Git Provider Type',
    items: trigger.trigger,
  });
  initialResourceFormValues.name = trigger.name;
  initialResourceFormValues.trigger = pick;
  if (trigger.commandId) initialResourceFormValues.commandId = trigger.commandId;
  return await addTriggerToPipeline(initialResourceFormValues);
}
