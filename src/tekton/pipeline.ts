/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { TektonItem } from './tektonitem';
import { Progress } from '../util/progress';
import { window, ViewColumn } from 'vscode';
import * as cliInstance from '../cli';
import { cli } from '../cli';
import { TknPipelineTrigger } from '../tekton';
import { PipelineWizard } from '../pipeline/wizard';
import { collectWizardContent } from './collect-data-for-wizard';
import { triggerDetection } from '../util/detection';
import { telemetryLog, telemetryLogError } from '../telemetry';
import { TektonNode } from '../tree-view/tekton-node';
import { Command } from '../cli-command';
import { startPipelineFromJson } from './start-pipeline-from-json';

export class Pipeline extends TektonItem {

  static async start(pipeline: TektonNode, commandId?: string): Promise<string> {
    if (!pipeline) {
      pipeline = await window.showQuickPick(await Pipeline.getPipelineNames(), { placeHolder: 'Select Pipeline to start', ignoreFocusOut: true });
    }
    if (!pipeline) return null;
    Pipeline.startWizard(pipeline, commandId);
  }

  static async restart(pipeline: TektonNode, commandId?: string): Promise<string> {
    if (!pipeline) {
      pipeline = await window.showQuickPick(await Pipeline.getPipelineNames(), { placeHolder: 'Select Pipeline to restart', ignoreFocusOut: true });
    }
    if (!pipeline) return null;
    return Progress.execFunctionWithProgress(`Creating the Pipeline '${pipeline.getName()}'.`, () =>
      Pipeline.tkn.restartPipeline(pipeline)
        .then(() => Pipeline.explorer.refresh())
        .then(() => {
          telemetryLog(commandId, 'successfully restarted');
          window.showInformationMessage(`Pipeline '${pipeline.getName()}' successfully created`);
        })
        .catch((error) => {
          telemetryLogError(commandId, error);
          return Promise.reject(`Failed to create Pipeline with error '${error}'`)
        })
    );
  }

  static refresh(commandId?: string): void {
    triggerDetection();
    Pipeline.explorer.refresh();
    telemetryLog(commandId, 'Refresh command click');
  }


  static about(commandId?: string): void {
    telemetryLog(commandId, 'About command click');
    Pipeline.tkn.executeInTerminal(Command.printTknVersion());
  }

  static async showTektonOutput(commandId?: string): Promise<void> {
    telemetryLog(commandId, 'Output channel click');
    cli.showOutputChannel();
  }

  static async describe(pipeline: TektonNode): Promise<void> {
    if (!pipeline) {
      pipeline = await window.showQuickPick(await Pipeline.getPipelineNames(), { placeHolder: 'Select Pipeline to describe', ignoreFocusOut: true });
    }
    if (!pipeline) return null;
    Pipeline.tkn.executeInTerminal(Command.describePipelines(pipeline.getName()));
  }

  static async list(pipeline: TektonNode): Promise<void> {
    if (!pipeline) {
      pipeline = await Pipeline.getPipelineNode();
    }
    if (!pipeline) return null;
    Pipeline.tkn.executeInTerminal(Command.listPipelinesInTerminal(pipeline.getName()));
  }

  static getDeleteCommand(pipeline: TektonNode): cliInstance.CliCommand {
    return Command.deletePipeline(pipeline.getName());
  }

  static async startWizard(pipeline: TektonNode, commandId?: string): Promise<void | string> {
    if (!pipeline) return null;
    const result: cliInstance.CliExitData = await Pipeline.tkn.execute(Command.getPipeline(pipeline.getName()), process.cwd(), false);
    let pipelineResource: TknPipelineTrigger;
    if (result.error) {
      telemetryLogError(commandId, result.error);
      return window.showErrorMessage(`${result.error} Std.err when processing pipelines`)
    }
    try {
      pipelineResource = JSON.parse(result.stdout);
    } catch (err) {
      return window.showErrorMessage(`fail to fetch pipeline resource data for ${pipeline.getName()}, reason: ${err}`);
    }
    const trigger = await collectWizardContent(pipelineResource.metadata.name, pipelineResource.spec.params, pipelineResource.spec.resources, pipelineResource.spec.workspaces, false);
    if (commandId) trigger.commandId = commandId;
    if (!trigger.workspaces && !trigger.resources && !trigger.params) {
      delete trigger.serviceAccount;
      await startPipelineFromJson(trigger);
    } else {
      PipelineWizard.create({ trigger, resourceColumn: ViewColumn.Active }, ViewColumn.Active, 'Start Pipeline', trigger.name);
    }
  }
}
