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
import { Trigger, PipelineContent } from './pipelinecontent';
import { PipelineWizard } from '../pipeline/wizard';
import { pipelineData } from './webviewstartpipeline';
import { startPipeline } from './startpipeline';
import { triggerDetection } from '../util/detection';
import { telemetryLogCommand, telemetryLogError } from '../telemetry';
import { Command } from '../util/command';
import { TektonNode } from '../tree-view/tekton-node';

export class Pipeline extends TektonItem {

  static async start(pipeline: TektonNode, commandId?: string): Promise<string> {
    if (!pipeline) {
      pipeline = await window.showQuickPick(await Pipeline.getPipelineNames(), { placeHolder: 'Select Pipeline to start', ignoreFocusOut: true });
    }
    if (!pipeline) return null;
    if (Pipeline.startQuickPick()) {
      const result: cliInstance.CliExitData = await Pipeline.tkn.execute(Command.listPipelines(), process.cwd(), false);
      let data: TknPipelineTrigger[] = [];
      if (result.error) {
        telemetryLogError(commandId, result.error);
        return window.showErrorMessage(`${result.error} Std.err when processing pipelines`)
      }
      try {
        data = JSON.parse(result.stdout).items;
      } catch (ignore) {
        //show no pipelines if output is not correct json
      }

      const pipelineTrigger = data.filter((value) => {
        return value.metadata.name === pipeline.getName()
      }).map<Trigger>(value => ({
        name: value.metadata.name,
        resources: value.spec.resources,
        params: value.spec.params ? value.spec.params : undefined,
        workspaces: value.spec['workspaces'] ? value.spec['workspaces'] : undefined,
        serviceAcct: value.spec.serviceAccount ? value.spec.serviceAccount : undefined
      }));

      const inputStartPipeline = await PipelineContent.startObject(pipelineTrigger, 'Pipeline');
      if (commandId) inputStartPipeline.commandId = commandId;
      return await startPipeline(inputStartPipeline);
    } else {
      Pipeline.startWizard(pipeline, commandId);
    }
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
          telemetryLogCommand(commandId, 'successfully restarted');
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
    telemetryLogCommand(commandId, 'Refresh command click');
  }


  static about(commandId?: string): void {
    telemetryLogCommand(commandId, 'About command click');
    Pipeline.tkn.executeInTerminal(Command.printTknVersion());
  }

  static async showTektonOutput(commandId?: string): Promise<void> {
    telemetryLogCommand(commandId, 'Output channel click');
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
    let data: TknPipelineTrigger;
    if (result.error) {
      telemetryLogError(commandId, result.error);
      return window.showErrorMessage(`${result.error} Std.err when processing pipelines`)
    }
    try {
      data = JSON.parse(result.stdout);
    } catch (ignore) {
      //show no pipelines if output is not correct json
    }
    const trigger = await pipelineData(data);
    if (commandId) trigger.commandId = commandId;
    if (!trigger.workspaces && !trigger.resources && !trigger.params) {
      await startPipeline(trigger);
    } else {
      PipelineWizard.create({ trigger, resourceColumn: ViewColumn.Active }, ViewColumn.Active, 'Start Pipeline', trigger.name);
    }
  }
}
