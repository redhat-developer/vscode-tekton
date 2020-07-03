/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { TektonItem } from './tektonitem';
import { TektonNode, Command } from '../tkn';
import { Progress } from '../util/progress';
import { window, ViewColumn } from 'vscode';
import * as cliInstance from '../cli';
import { cli } from '../cli';
import { TknPipelineTrigger } from '../tekton';
import { Trigger, PipelineContent } from './pipelinecontent';
import { PipelineWizard } from '../pipeline/wizard';

export class Pipeline extends TektonItem {

  static async start(pipeline: TektonNode): Promise<string> {
    if (!pipeline) {
      pipeline = await window.showQuickPick(await Pipeline.getPipelineNames(), { placeHolder: 'Select Pipeline to start', ignoreFocusOut: true });
    }
    if (!pipeline) return null;
    const result: cliInstance.CliExitData = await Pipeline.tkn.execute(Command.listPipelines(), process.cwd(), false);
    let data: TknPipelineTrigger[] = [];
    if (result.error) {
      console.log(result + ' Std.err when processing pipelines');
    }
    try {
      data = JSON.parse(result.stdout).items;
    } catch (ignore) {
      //show no pipelines if output is not correct json
    }

    const pipelineTrigger = data.map<Trigger>(value => ({
      name: value.metadata.name,
      resources: value.spec.resources,
      params: value.spec.params ? value.spec.params : undefined,
      workspaces: value.spec['workspaces'] ? value.spec['workspaces'] : undefined,
      serviceAcct: value.spec.serviceAccount ? value.spec.serviceAccount : undefined
    })).filter(function (obj) {
      return obj.name === pipeline.getName();
    });
    const inputStartPipeline = await PipelineContent.startObject(pipelineTrigger, 'Pipeline');

    return Progress.execFunctionWithProgress(`Starting Pipeline '${inputStartPipeline.name}'.`, () =>
      Pipeline.tkn.startPipeline(inputStartPipeline)
        .then(() => Pipeline.explorer.refresh())
        .then(() => `Pipeline '${inputStartPipeline.name}' successfully started`)
        .catch((error) => Promise.reject(`Failed to start Pipeline with error '${error}'`))
    );
  }

  static async restart(pipeline: TektonNode): Promise<string> {
    if (!pipeline) {
      pipeline = await window.showQuickPick(await Pipeline.getPipelineNames(), { placeHolder: 'Select Pipeline to restart', ignoreFocusOut: true });
    }
    if (!pipeline) return null;
    return Progress.execFunctionWithProgress(`Creating the Pipeline '${pipeline.getName()}'.`, () =>
      Pipeline.tkn.restartPipeline(pipeline)
        .then(() => Pipeline.explorer.refresh())
        .then(() => `Pipeline '${pipeline.getName()}' successfully created`)
        .catch((error) => Promise.reject(`Failed to create Pipeline with error '${error}'`))
    );
  }

  static refresh(): void {
    Pipeline.explorer.refresh();
  }


  static about(): void {
    Pipeline.tkn.executeInTerminal(Command.printTknVersion());
  }

  static async showTektonOutput(): Promise<void> {
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

  static async delete(pipeline: TektonNode): Promise<string> {
    if (!pipeline) {
      pipeline = await window.showQuickPick(await Pipeline.getPipelineNames(), { placeHolder: 'Select Pipeline to delete', ignoreFocusOut: true });
    }
    if (!pipeline) return null;
    const value = await window.showWarningMessage(`Do you want to delete the Pipeline '${pipeline.getName()}'?`, 'Yes', 'Cancel');
    if (value === 'Yes') {
      return Progress.execFunctionWithProgress(`Deleting the Pipeline '${pipeline.getName()}'.`, () =>
        Pipeline.tkn.execute(Command.deletePipeline(pipeline.getName())))
        .then(() => Pipeline.explorer.refresh(pipeline.getParent() ? pipeline.getParent() : undefined))
        .then(() => `The Pipeline '${pipeline.getName()}' successfully deleted.`)
        .catch((err) => Promise.reject(`Failed to delete the Pipeline '${pipeline.getName()}': '${err}'.`));
    }
    return null;
  }

  static async startWizard(pipeline: TektonNode): Promise<void> {
    const result: cliInstance.CliExitData = await Pipeline.tkn.execute(Command.getPipeline(pipeline.getName()), process.cwd(), false);
    let data: TknPipelineTrigger;
    if (result.error) {
      console.log(result + ' Std.err when processing pipelines');
    }
    try {
      data = JSON.parse(result.stdout);
    } catch (ignore) {
      //show no pipelines if output is not correct json
    }

    const trigger = {
      name: data.metadata.name,
      resources: data.spec.resources,
      params: data.spec.params,
      workspaces: data.spec['workspaces'],
      serviceAcct: data.spec.serviceAccount
    };

    const wizard = PipelineWizard.create({ trigger, resourceColumn: ViewColumn.Active }, ViewColumn.Active);

  }
}
